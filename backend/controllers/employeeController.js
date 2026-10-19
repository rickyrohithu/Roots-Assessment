const { Employee } = require('../models/Employee');
const { Task } = require('../models/Task');
const { normalizeDate } = require('../utils/businessRules');

// @desc    Get all employees with pagination, search, filters, and active task count
// @route   GET /api/employees
const getEmployees = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const skip = (page - 1) * limit;

    const { search, department, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const query = { isDeleted: false };

    // Search filter across fullName, employeeId, email, role
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { fullName: searchRegex },
        { employeeId: searchRegex },
        { email: searchRegex },
        { role: searchRegex },
      ];
    }

    // Department filter
    if (department && department !== 'All') {
      query.department = department;
    }

    // Status filter
    if (status && status !== 'All') {
      query.status = status;
    }

    // Sorting
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [total, employees] = await Promise.all([
      Employee.countDocuments(query),
      Employee.find(query).sort(sort).skip(skip).limit(limit),
    ]);

    // Attach active task count for each employee
    const employeeIds = employees.map((emp) => emp._id);
    const activeTasksCounts = await Task.aggregate([
      {
        $match: {
          assignedEmployee: { $in: employeeIds },
          status: { $in: ['Todo', 'In Progress'] },
        },
      },
      {
        $group: {
          _id: '$assignedEmployee',
          count: { $sum: 1 },
        },
      },
    ]);

    const activeMap = {};
    activeTasksCounts.forEach((item) => {
      activeMap[item._id.toString()] = item.count;
    });

    const employeesWithWorkload = employees.map((emp) => {
      const empObj = emp.toObject();
      empObj.activeTasksCount = activeMap[emp._id.toString()] || 0;
      return empObj;
    });

    res.status(200).json({
      success: true,
      data: employeesWithWorkload,
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

// @desc    Get assignable employee options for task form
// @route   GET /api/employees/options/assignable
const getAssignableEmployees = async (req, res, next) => {
  try {
    const { startDate } = req.query;
    const employees = await Employee.find({ isDeleted: false, status: { $ne: 'Inactive' } }).sort({
      fullName: 1,
    });

    // Get active tasks count for all employees
    const activeTasksCounts = await Task.aggregate([
      {
        $match: {
          status: { $in: ['Todo', 'In Progress'] },
        },
      },
      {
        $group: {
          _id: '$assignedEmployee',
          count: { $sum: 1 },
        },
      },
    ]);

    const activeMap = {};
    activeTasksCounts.forEach((item) => {
      activeMap[item._id.toString()] = item.count;
    });

    const results = employees.map((emp) => {
      const activeCount = activeMap[emp._id.toString()] || 0;
      let isEligible = true;
      let ineligibleReason = null;

      if (activeCount >= 3) {
        isEligible = false;
        ineligibleReason = 'At maximum capacity (3 active tasks)';
      }

      if (emp.status === 'On Leave' && startDate && emp.leaveStart && emp.leaveEnd) {
        const s = normalizeDate(startDate);
        const ls = normalizeDate(emp.leaveStart);
        const le = normalizeDate(emp.leaveEnd);
        if (s && ls && le && s >= ls && s <= le) {
          isEligible = false;
          ineligibleReason = `On Leave from ${new Date(emp.leaveStart).toLocaleDateString()} to ${new Date(emp.leaveEnd).toLocaleDateString()}`;
        }
      }

      return {
        _id: emp._id,
        employeeId: emp.employeeId,
        fullName: emp.fullName,
        email: emp.email,
        department: emp.department,
        role: emp.role,
        status: emp.status,
        leaveStart: emp.leaveStart,
        leaveEnd: emp.leaveEnd,
        activeTasksCount: activeCount,
        isEligible,
        ineligibleReason,
      };
    });

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single employee by ID with tasks
// @route   GET /api/employees/:id
const getEmployeeById = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ _id: req.params.id, isDeleted: false });
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found',
      });
    }

    // Fetch tasks assigned to this employee
    const tasks = await Task.find({ assignedEmployee: employee._id }).sort({ createdAt: -1 });

    const activeTasks = tasks.filter((t) => t.status === 'Todo' || t.status === 'In Progress');
    const completedTasks = tasks.filter((t) => t.status === 'Completed');
    const cancelledTasks = tasks.filter((t) => t.status === 'Cancelled');

    res.status(200).json({
      success: true,
      data: {
        ...employee.toObject(),
        tasks,
        stats: {
          total: tasks.length,
          active: activeTasks.length,
          completed: completedTasks.length,
          cancelled: cancelledTasks.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new employee
// @route   POST /api/employees
const createEmployee = async (req, res, next) => {
  try {
    const {
      employeeId,
      fullName,
      email,
      phone,
      department,
      role,
      joiningDate,
      status = 'Active',
      skills = [],
      leaveStart,
      leaveEnd,
    } = req.body;

    if (!employeeId || !fullName || !email || !phone || !department || !role || !joiningDate) {
      return res.status(400).json({
        success: false,
        error: 'Please provide all required fields (Employee ID, Full Name, Email, Phone, Department, Role, Joining Date)',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const formattedId = employeeId.trim().toUpperCase();

    // Check duplicate ID
    const existingId = await Employee.findOne({ employeeId: formattedId });
    if (existingId) {
      return res.status(409).json({
        success: false,
        error: `Employee ID "${formattedId}" is already registered. Please use a unique Employee ID.`,
      });
    }

    // Check duplicate email
    const existingEmail = await Employee.findOne({ email: normalizedEmail });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        error: `Email "${normalizedEmail}" is already registered. Please use a unique email.`,
      });
    }

    // Validate leave dates if On Leave
    if (status === 'On Leave') {
      if (!leaveStart || !leaveEnd) {
        return res.status(400).json({
          success: false,
          error: 'Leave Start and Leave End dates are required when status is On Leave.',
        });
      }
      if (normalizeDate(leaveEnd) < normalizeDate(leaveStart)) {
        return res.status(400).json({
          success: false,
          error: 'Leave End date cannot be earlier than Leave Start date.',
        });
      }
    }

    // Clean skills array if passed as string
    let parsedSkills = skills;
    if (typeof skills === 'string') {
      parsedSkills = skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }

    const employee = await Employee.create({
      employeeId: formattedId,
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      department,
      role: role.trim(),
      joiningDate: new Date(joiningDate),
      status,
      skills: parsedSkills,
      leaveStart: status === 'On Leave' ? new Date(leaveStart) : null,
      leaveEnd: status === 'On Leave' ? new Date(leaveEnd) : null,
    });

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: employee,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update employee
// @route   PUT /api/employees/:id
const updateEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ _id: req.params.id, isDeleted: false });
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found',
      });
    }

    const {
      employeeId,
      fullName,
      email,
      phone,
      department,
      role,
      joiningDate,
      status,
      skills,
      leaveStart,
      leaveEnd,
    } = req.body;

    // Check uniqueness for employeeId if changed
    if (employeeId && employeeId.trim().toUpperCase() !== employee.employeeId) {
      const formattedId = employeeId.trim().toUpperCase();
      const existingId = await Employee.findOne({
        employeeId: formattedId,
        _id: { $ne: employee._id },
      });
      if (existingId) {
        return res.status(409).json({
          success: false,
          error: `Employee ID "${formattedId}" is already taken.`,
        });
      }
      employee.employeeId = formattedId;
    }

    // Check uniqueness for email if changed
    if (email && email.trim().toLowerCase() !== employee.email) {
      const normalizedEmail = email.trim().toLowerCase();
      const existingEmail = await Employee.findOne({
        email: normalizedEmail,
        _id: { $ne: employee._id },
      });
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          error: `Email "${normalizedEmail}" is already registered.`,
        });
      }
      employee.email = normalizedEmail;
    }

    if (fullName) employee.fullName = fullName.trim();
    if (phone) employee.phone = phone.trim();
    if (department) employee.department = department;
    if (role) employee.role = role.trim();
    if (joiningDate) employee.joiningDate = new Date(joiningDate);

    const targetStatus = status !== undefined ? status : employee.status;
    if (targetStatus === 'On Leave') {
      const ls = leaveStart !== undefined ? leaveStart : employee.leaveStart;
      const le = leaveEnd !== undefined ? leaveEnd : employee.leaveEnd;
      if (!ls || !le) {
        return res.status(400).json({
          success: false,
          error: 'Leave Start and Leave End dates are required when status is On Leave.',
        });
      }
      if (normalizeDate(le) < normalizeDate(ls)) {
        return res.status(400).json({
          success: false,
          error: 'Leave End date cannot be earlier than Leave Start date.',
        });
      }
      employee.leaveStart = new Date(ls);
      employee.leaveEnd = new Date(le);
    } else if (targetStatus !== 'On Leave') {
      employee.leaveStart = null;
      employee.leaveEnd = null;
    }

    if (status) employee.status = status;

    if (skills !== undefined) {
      employee.skills = Array.isArray(skills)
        ? skills
        : typeof skills === 'string'
        ? skills.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
    }

    await employee.save();

    // Update snapshots on tasks assigned to this employee so tasks stay synchronized
    await Task.updateMany(
      { assignedEmployee: employee._id },
      {
        $set: {
          'employeeSnapshot.employeeId': employee.employeeId,
          'employeeSnapshot.fullName': employee.fullName,
          'employeeSnapshot.email': employee.email,
          'employeeSnapshot.department': employee.department,
          'employeeSnapshot.role': employee.role,
        },
      }
    );

    res.status(200).json({
      success: true,
      message: 'Employee updated successfully',
      data: employee,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete employee (Enforce business rule: not allowed while employee has Todo / In Progress tasks)
// @route   DELETE /api/employees/:id
const deleteEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ _id: req.params.id, isDeleted: false });
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found',
      });
    }

    // BUSINESS RULE CHECK: Delete employee: not allowed while the employee has Todo / In Progress tasks.
    const activeTasksCount = await Task.countDocuments({
      assignedEmployee: employee._id,
      status: { $in: ['Todo', 'In Progress'] },
    });

    if (activeTasksCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete employee: ${employee.fullName} currently has ${activeTasksCount} active task(s) (Todo or In Progress). Please reassign or complete these tasks before deleting.`,
      });
    }

    // Safe deletion: soft-delete or remove employee document.
    // Spec says: "Old tasks must still show meaningful employee details if the employee is later deleted."
    // Because tasks store employeeSnapshot, old tasks will retain employee details!
    employee.isDeleted = true;
    await employee.save();

    res.status(200).json({
      success: true,
      message: `Employee "${employee.fullName}" was successfully removed. Historical tasks retain their employee details.`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEmployees,
  getAssignableEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
};
