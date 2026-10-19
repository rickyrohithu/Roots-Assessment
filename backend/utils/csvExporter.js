/**
 * Generates CSV string from tasks array
 */
function tasksToCSV(tasks) {
  const headers = [
    'Task ID',
    'Title',
    'Description',
    'Department',
    'Priority',
    'Status',
    'Overdue',
    'Assigned Employee ID',
    'Assigned Employee Name',
    'Employee Email',
    'Start Date',
    'Due Date',
    'Completed Date',
    'Created At',
  ];

  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = tasks.map((task) => {
    const empName =
      (task.assignedEmployee && task.assignedEmployee.fullName) ||
      (task.employeeSnapshot && task.employeeSnapshot.fullName) ||
      'Unassigned / Deleted';

    const empId =
      (task.assignedEmployee && task.assignedEmployee.employeeId) ||
      (task.employeeSnapshot && task.employeeSnapshot.employeeId) ||
      'N/A';

    const empEmail =
      (task.assignedEmployee && task.assignedEmployee.email) ||
      (task.employeeSnapshot && task.employeeSnapshot.email) ||
      'N/A';

    const startDate = task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '';
    const dueDate = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '';
    const completedDate = task.completedDate
      ? new Date(task.completedDate).toISOString().split('T')[0]
      : '';
    const createdAt = task.createdAt ? new Date(task.createdAt).toISOString() : '';

    return [
      escapeCSV(task.taskId),
      escapeCSV(task.title),
      escapeCSV(task.description || ''),
      escapeCSV(task.department),
      escapeCSV(task.priority),
      escapeCSV(task.status),
      escapeCSV(task.isOverdue ? 'YES (OVERDUE)' : 'No'),
      escapeCSV(empId),
      escapeCSV(empName),
      escapeCSV(empEmail),
      escapeCSV(startDate),
      escapeCSV(dueDate),
      escapeCSV(completedDate),
      escapeCSV(createdAt),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

module.exports = {
  tasksToCSV,
};
