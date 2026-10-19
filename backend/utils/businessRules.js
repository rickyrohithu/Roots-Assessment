const { Employee } = require('../models/Employee');
const { Task, VALID_TRANSITIONS } = require('../models/Task');

/**
 * Normalizes a date to YYYY-MM-DD midnight for precise date-only comparisons
 */
function normalizeDate(d) {
  if (!d) return null;
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Validate employee eligibility for task assignment:
 * - Active: allowed
 * - Inactive: rejected
 * - On Leave: rejected if task.startDate is between leaveStart and leaveEnd (inclusive)
 */
async function validateEmployeeAssignment(employeeId, taskStartDate) {
  const employee = await Employee.findById(employeeId);
  if (!employee) {
    const err = new Error('Assigned employee does not exist');
    err.statusCode = 404;
    throw err;
  }

  if (employee.status === 'Inactive') {
    const err = new Error('Cannot assign task to an Inactive employee.');
    err.statusCode = 400;
    throw err;
  }

  if (employee.status === 'On Leave') {
    if (employee.leaveStart && employee.leaveEnd) {
      const taskStart = normalizeDate(taskStartDate);
      const leaveStart = normalizeDate(employee.leaveStart);
      const leaveEnd = normalizeDate(employee.leaveEnd);

      if (taskStart >= leaveStart && taskStart <= leaveEnd) {
        const startStr = new Date(employee.leaveStart).toLocaleDateString();
        const endStr = new Date(employee.leaveEnd).toLocaleDateString();
        const err = new Error(
          `Cannot assign task: ${employee.fullName} is On Leave from ${startStr} to ${endStr} (task starts on ${new Date(taskStartDate).toLocaleDateString()}).`
        );
        err.statusCode = 400;
        throw err;
      }
    }
  }

  return employee;
}

/**
 * Validate capacity rule: One employee can hold at most 3 active tasks (Todo + In Progress)
 * @param {string} employeeId
 * @param {string} excludeTaskId - taskId to exclude if editing an existing task
 */
async function validateEmployeeCapacity(employeeId, excludeTaskId = null) {
  const query = {
    assignedEmployee: employeeId,
    status: { $in: ['Todo', 'In Progress'] },
  };

  if (excludeTaskId) {
    query._id = { $ne: excludeTaskId };
  }

  const activeTaskCount = await Task.countDocuments(query);
  if (activeTaskCount >= 3) {
    const err = new Error('Employee already has 3 active tasks. Please choose another employee.');
    err.statusCode = 400;
    throw err;
  }

  return activeTaskCount;
}

/**
 * Validate status transition
 */
function validateStatusTransition(currentStatus, newStatus) {
  if (currentStatus === newStatus) {
    return true;
  }

  const allowed = VALID_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(newStatus)) {
    const err = new Error(
      `Invalid status transition from "${currentStatus}" to "${newStatus}". Allowed transitions: ${
        allowed.length > 0 ? allowed.join(', ') : 'none (terminal status)'
      }`
    );
    err.statusCode = 400;
    throw err;
  }

  return true;
}

/**
 * Check if a task is overdue
 */
function isTaskOverdue(dueDate, status) {
  if (status === 'Completed' || status === 'Cancelled') {
    return false;
  }
  if (!dueDate) return false;
  const today = normalizeDate(new Date());
  const due = normalizeDate(dueDate);
  return today > due;
}

module.exports = {
  normalizeDate,
  validateEmployeeAssignment,
  validateEmployeeCapacity,
  validateStatusTransition,
  isTaskOverdue,
};
