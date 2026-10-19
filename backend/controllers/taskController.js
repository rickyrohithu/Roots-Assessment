const { Task, VALID_TRANSITIONS } = require('../models/Task');
const { Employee } = require('../models/Employee');
const Counter = require('../models/Counter');
const {
  normalizeDate,
  validateEmployeeAssignment,
  validateEmployeeCapacity,
  validateStatusTransition,
  isTaskOverdue,
} = require('../utils/businessRules');
const { tasksToCSV } = require('../utils/csvExporter');

/**
 * Builds search/filter query and sorting aggregation/find criteria
 */
const buildTaskQuery = (queryParams) => {
  const { search, department, priority, status, dueFrom, dueTo } = queryParams;
  const match = {};

  // Department filter
  if (department && department !== 'All') {
    match.department = department;
  }

  // Priority filter
  if (priority && priority !== 'All') {
    match.priority = priority;
  }

  // Status filter
  if (status && status !== 'All') {
    match.status = status;
  }

  // Due Date Range filter
  if (dueFrom || dueTo) {
    match.dueDate = {};
    if (dueFrom) {
      const fromDate = new Date(dueFrom);
      fromDate.setHours(0, 0, 0, 0);
      match.dueDate.$gte = fromDate;
    }
    if (dueTo) {
      const toDate = new Date(dueTo);
      toDate.setHours(23, 59, 59, 999);
      match.dueDate.$lte = toDate;
    }
  }

  return match;
};

// @desc    Get all tasks with pagination, search, filters, and custom sorting
// @route   GET /api/tasks
const getTasks = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const skip = (page - 1) * limit;

    const { search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const match = buildTaskQuery(req.query);

    // Build aggregation pipeline to support search on employee name and priority importance sort
    const pipeline = [];

    // Filter match stage
    if (Object.keys(match).length > 0) {
      pipeline.push({ $match: match });
    }

    // Lookup employee
    pipeline.push({
      $lookup: {
        from: 'employees',
        localField: 'assignedEmployee',
        foreignField: '_id',
        as: 'assignedEmployeeDoc',
      },
    });

    pipeline.push({
      $unwind: {
        path: '$assignedEmployeeDoc',
        preserveNullAndEmptyArrays: true,
      },
    });

    // Search filter across task title, task ID, and employee name
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      pipeline.push({
        $match: {
          $or: [
            { title: searchRegex },
            { taskId: searchRegex },
            { 'assignedEmployeeDoc.fullName': searchRegex },
            { 'employeeSnapshot.fullName': searchRegex },
          ],
        },
      });
    }

    // Add fields for priority weight and overdue calculation
    pipeline.push({
      $addFields: {
        priorityWeight: {
          $switch: {
            branches: [
              { case: { $eq: ['$priority', 'Critical'] }, then: 4 },
              { case: { $eq: ['$priority', 'High'] }, then: 3 },
              { case: { $eq: ['$priority', 'Medium'] }, then: 2 },
              { case: { $eq: ['$priority', 'Low'] }, then: 1 },
            ],
            default: 0,
          },
        },
        isOverdue: {
          $cond: {
            if: {
              $and: [
                { $ne: ['$status', 'Completed'] },
                { $ne: ['$status', 'Cancelled'] },
                { $lt: ['$dueDate', new Date()] },
              ],
            },
            then: true,
            else: false,
          },
        },
      },
    });

    // Sorting stage
    const sortStage = {};
    const order = sortOrder === 'asc' ? 1 : -1;

    if (sortBy === 'priority') {
      sortStage.priorityWeight = order;
      sortStage.createdAt = -1;
    } else if (sortBy === 'dueDate') {
      sortStage.dueDate = order;
    } else if (sortBy === 'title') {
      sortStage.title = order;
    } else {
      sortStage.createdAt = order;
    }

    // Facet for pagination and total count
    pipeline.push({
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [
          { $sort: sortStage },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              taskId: 1,
              title: 1,
              description: 1,
              assignedEmployee: {
                $ifNull: ['$assignedEmployeeDoc', '$employeeSnapshot'],
              },
              employeeSnapshot: 1,
              department: 1,
              priority: 1,
              status: 1,
              startDate: 1,
              dueDate: 1,
              completedDate: 1,
              createdAt: 1,
              updatedAt: 1,
              isOverdue: 1,
            },
          },
        ],
      },
    });

    const result = await Task.aggregate(pipeline);
    const total = result[0]?.metadata[0]?.total || 0;
    const tasks = result[0]?.data || [];

    res.status(200).json({
      success: true,
      data: tasks,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export tasks to CSV with matching filters
// @route   GET /api/tasks/export/csv
const exportTasksCSV = async (req, res, next) => {
  try {
    const { search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const match = buildTaskQuery(req.query);

    const pipeline = [];
    if (Object.keys(match).length > 0) {
      pipeline.push({ $match: match });
    }

    pipeline.push({
      $lookup: {
        from: 'employees',
        localField: 'assignedEmployee',
        foreignField: '_id',
        as: 'assignedEmployeeDoc',
      },
    });

    pipeline.push({
      $unwind: {
        path: '$assignedEmployeeDoc',
        preserveNullAndEmptyArrays: true,
      },
    });

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      pipeline.push({
        $match: {
          $or: [
            { title: searchRegex },
            { taskId: searchRegex },
            { 'assignedEmployeeDoc.fullName': searchRegex },
            { 'employeeSnapshot.fullName': searchRegex },
          ],
        },
      });
    }

    pipeline.push({
      $addFields: {
        priorityWeight: {
          $switch: {
            branches: [
              { case: { $eq: ['$priority', 'Critical'] }, then: 4 },
              { case: { $eq: ['$priority', 'High'] }, then: 3 },
              { case: { $eq: ['$priority', 'Medium'] }, then: 2 },
              { case: { $eq: ['$priority', 'Low'] }, then: 1 },
            ],
            default: 0,
          },
        },
        isOverdue: {
          $cond: {
            if: {
              $and: [
                { $ne: ['$status', 'Completed'] },
                { $ne: ['$status', 'Cancelled'] },
                { $lt: ['$dueDate', new Date()] },
              ],
            },
            then: true,
            else: false,
          },
        },
      },
    });

    const sortStage = {};
    const order = sortOrder === 'asc' ? 1 : -1;
    if (sortBy === 'priority') {
      sortStage.priorityWeight = order;
    } else if (sortBy === 'dueDate') {
      sortStage.dueDate = order;
    } else if (sortBy === 'title') {
      sortStage.title = order;
    } else {
      sortStage.createdAt = order;
    }
    pipeline.push({ $sort: sortStage });

    pipeline.push({
      $project: {
        taskId: 1,
        title: 1,
        description: 1,
        department: 1,
        priority: 1,
        status: 1,
        startDate: 1,
        dueDate: 1,
        completedDate: 1,
        createdAt: 1,
        isOverdue: 1,
        assignedEmployee: {
          $ifNull: ['$assignedEmployeeDoc', '$employeeSnapshot'],
        },
        employeeSnapshot: 1,
      },
    });

    const tasks = await Task.aggregate(pipeline);
    const csvData = tasksToCSV(tasks);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="tasks_export_${Date.now()}.csv"`
    );
    return res.status(200).send(csvData);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single task by ID
// @route   GET /api/tasks/:id
const getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id).populate('assignedEmployee');
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
      });
    }

    const taskObj = task.toObject();
    // If assignedEmployee was deleted, provide fallback snapshot
    if (!taskObj.assignedEmployee && taskObj.employeeSnapshot) {
      taskObj.assignedEmployee = taskObj.employeeSnapshot;
    }

    // Attach allowed next statuses for frontend UI
    taskObj.validNextStatuses = VALID_TRANSITIONS[task.status] || [];

    res.status(200).json({
      success: true,
      data: taskObj,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new task
// @route   POST /api/tasks
const createTask = async (req, res, next) => {
  try {
    const {
      title,
      description = '',
      assignedEmployee,
      department,
      priority = 'Medium',
      startDate,
      dueDate,
    } = req.body;

    // Field validations
    if (!title || !assignedEmployee || !department || !startDate || !dueDate) {
      return res.status(400).json({
        success: false,
        error: 'Please provide Title, Assigned Employee, Department, Start Date, and Due Date.',
      });
    }

    // Date validation: Due Date cannot be earlier than Start Date
    const startNormalized = normalizeDate(startDate);
    const dueNormalized = normalizeDate(dueDate);
    if (dueNormalized < startNormalized) {
      return res.status(400).json({
        success: false,
        error: 'Due Date cannot be earlier than Start Date.',
      });
    }

    // Business rule 1: Employee assignment rules (Active only, reject Inactive, reject On Leave if startDate overlaps)
    const employee = await validateEmployeeAssignment(assignedEmployee, startDate);

    // Business rule 2: Capacity check (At most 3 active tasks: Todo + In Progress)
    await validateEmployeeCapacity(assignedEmployee);

    // Auto-generate Task ID e.g. TSK-001
    const seq = await Counter.getNextSequence('taskId');
    const taskId = `TSK-${String(seq).padStart(3, '0')}`;

    // Create task (status ALWAYS starts as Todo, completedDate is never from frontend)
    const task = await Task.create({
      taskId,
      title: title.trim(),
      description: description ? description.trim() : '',
      assignedEmployee: employee._id,
      employeeSnapshot: {
        employeeId: employee.employeeId,
        fullName: employee.fullName,
        email: employee.email,
        department: employee.department,
        role: employee.role,
      },
      department,
      priority,
      status: 'Todo', // New tasks start as Todo
      startDate: new Date(startDate),
      dueDate: new Date(dueDate),
      completedDate: null,
    });

    const populatedTask = await Task.findById(task._id).populate('assignedEmployee');

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: populatedTask,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update task details (Normal Edit)
// @route   PUT /api/tasks/:id
const updateTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
      });
    }

    // BUSINESS RULE: Completed and Cancelled tasks cannot be edited.
    if (task.status === 'Completed' || task.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        error: `Cannot edit a ${task.status} task. Completed and Cancelled tasks are locked from further editing.`,
      });
    }

    // BUSINESS RULE & NEGATIVE POINT: Status CANNOT be edited through normal update API!
    if (req.body.status && req.body.status !== task.status) {
      return res.status(400).json({
        success: false,
        error: 'Task status cannot be changed via the general update API. Please use PUT /api/tasks/:id/status.',
      });
    }

    // NEVER accept completedDate from frontend
    if (req.body.completedDate !== undefined) {
      delete req.body.completedDate;
    }

    const {
      title,
      description,
      assignedEmployee,
      department,
      priority,
      startDate,
      dueDate,
    } = req.body;

    const newStartDate = startDate ? new Date(startDate) : task.startDate;
    const newDueDate = dueDate ? new Date(dueDate) : task.dueDate;

    // Date validation
    if (normalizeDate(newDueDate) < normalizeDate(newStartDate)) {
      return res.status(400).json({
        success: false,
        error: 'Due Date cannot be earlier than Start Date.',
      });
    }

    // Validate employee assignment and capacity if employee or startDate changed
    let targetEmployeeId = task.assignedEmployee;
    let employee = null;

    if (assignedEmployee && assignedEmployee.toString() !== task.assignedEmployee.toString()) {
      targetEmployeeId = assignedEmployee;
      // Validate assignment eligibility
      employee = await validateEmployeeAssignment(targetEmployeeId, newStartDate);
      // Validate capacity for the new employee
      await validateEmployeeCapacity(targetEmployeeId, task._id);
    } else if (startDate && normalizeDate(startDate) !== normalizeDate(task.startDate)) {
      // Re-validate assignment in case employee is on leave on new start date
      employee = await validateEmployeeAssignment(task.assignedEmployee, newStartDate);
    }

    if (!employee) {
      employee = await Employee.findById(targetEmployeeId);
    }

    // Update fields
    if (title) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (department) task.department = department;
    if (priority) task.priority = priority;
    task.startDate = newStartDate;
    task.dueDate = newDueDate;

    if (employee) {
      task.assignedEmployee = employee._id;
      task.employeeSnapshot = {
        employeeId: employee.employeeId,
        fullName: employee.fullName,
        email: employee.email,
        department: employee.department,
        role: employee.role,
      };
    }

    await task.save();

    const populatedTask = await Task.findById(task._id).populate('assignedEmployee');

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: populatedTask,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update task status (Enforces state machine and completedDate backend assignment)
// @route   PUT /api/tasks/:id/status
const updateTaskStatus = async (req, res, next) => {
  try {
    const { status: newStatus } = req.body;
    if (!newStatus) {
      return res.status(400).json({
        success: false,
        error: 'Status is required.',
      });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
      });
    }

    // Enforce state machine rules:
    // Todo -> In Progress -> Completed
    // Todo / In Progress -> Cancelled
    // Completed & Cancelled tasks cannot be edited.
    validateStatusTransition(task.status, newStatus);

    task.status = newStatus;

    // Completed Date is set by the backend when a task becomes Completed, never taken from frontend
    if (newStatus === 'Completed') {
      task.completedDate = new Date();
    } else {
      task.completedDate = null;
    }

    await task.save();

    const populatedTask = await Task.findById(task._id).populate('assignedEmployee');

    res.status(200).json({
      success: true,
      message: `Task status updated to ${newStatus}`,
      data: populatedTask,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
      });
    }

    await Task.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: `Task ${task.taskId} deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  exportTasksCSV,
};
