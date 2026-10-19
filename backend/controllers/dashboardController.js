const { Employee } = require('../models/Employee');
const { Task } = require('../models/Task');

// @desc    Get dashboard metrics (Employee counts, Task counts, Overdue, and Employee Workload)
// @route   GET /api/dashboard
const getDashboardMetrics = async (req, res, next) => {
  try {
    const today = new Date();

    // 1. Employee Metrics
    const [
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      onLeaveEmployees,
    ] = await Promise.all([
      Employee.countDocuments({ isDeleted: false }),
      Employee.countDocuments({ isDeleted: false, status: 'Active' }),
      Employee.countDocuments({ isDeleted: false, status: 'Inactive' }),
      Employee.countDocuments({ isDeleted: false, status: 'On Leave' }),
    ]);

    // 2. Task Metrics
    const [
      totalTasks,
      todoTasks,
      inProgressTasks,
      completedTasks,
      cancelledTasks,
      overdueTasks,
    ] = await Promise.all([
      Task.countDocuments(),
      Task.countDocuments({ status: 'Todo' }),
      Task.countDocuments({ status: 'In Progress' }),
      Task.countDocuments({ status: 'Completed' }),
      Task.countDocuments({ status: 'Cancelled' }),
      Task.countDocuments({
        status: { $nin: ['Completed', 'Cancelled'] },
        dueDate: { $lt: today },
      }),
    ]);

    // 3. Employee Workload (calculated on server)
    // Counts active tasks (Todo + In Progress) for each employee
    const workloadAggregation = await Task.aggregate([
      {
        $match: {
          status: { $in: ['Todo', 'In Progress'] },
        },
      },
      {
        $group: {
          _id: '$assignedEmployee',
          activeTasks: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'employees',
          localField: '_id',
          foreignField: '_id',
          as: 'employeeDoc',
        },
      },
      {
        $unwind: '$employeeDoc',
      },
      {
        $match: {
          'employeeDoc.isDeleted': false,
        },
      },
      {
        $project: {
          _id: 1,
          employeeId: '$employeeDoc.employeeId',
          fullName: '$employeeDoc.fullName',
          email: '$employeeDoc.email',
          department: '$employeeDoc.department',
          role: '$employeeDoc.role',
          status: '$employeeDoc.status',
          activeTasks: 1,
        },
      },
      {
        $sort: { activeTasks: -1, fullName: 1 },
      },
    ]);

    // Fetch all active employees so even those with 0 active tasks appear if needed
    const allActiveEmployees = await Employee.find({ isDeleted: false }).select(
      'employeeId fullName email department role status'
    );

    const workloadMap = {};
    workloadAggregation.forEach((w) => {
      workloadMap[w._id.toString()] = w.activeTasks;
    });

    const fullEmployeeWorkload = allActiveEmployees.map((emp) => ({
      _id: emp._id,
      employeeId: emp.employeeId,
      fullName: emp.fullName,
      email: emp.email,
      department: emp.department,
      role: emp.role,
      status: emp.status,
      activeTasks: workloadMap[emp._id.toString()] || 0,
    })).sort((a, b) => b.activeTasks - a.activeTasks || a.fullName.localeCompare(b.fullName));

    // Department-wise task breakdown (useful additional insight)
    const departmentDistribution = await Task.aggregate([
      {
        $group: {
          _id: '$department',
          total: { $sum: 1 },
          active: {
            $sum: {
              $cond: [{ $in: ['$status', ['Todo', 'In Progress']] }, 1, 0],
            },
          },
          completed: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0],
            },
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        employees: {
          total: totalEmployees,
          active: activeEmployees,
          inactive: inactiveEmployees,
          onLeave: onLeaveEmployees,
        },
        tasks: {
          total: totalTasks,
          todo: todoTasks,
          inProgress: inProgressTasks,
          completed: completedTasks,
          cancelled: cancelledTasks,
          overdue: overdueTasks,
        },
        employeeWorkload: fullEmployeeWorkload,
        departmentDistribution,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardMetrics,
};
