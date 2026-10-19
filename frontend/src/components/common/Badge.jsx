import React from 'react';

export const StatusBadge = ({ status }) => {
  let className = 'status-badge ';
  switch (status) {
    case 'Todo':
      className += 'badge-todo';
      break;
    case 'In Progress':
      className += 'badge-in-progress';
      break;
    case 'Completed':
      className += 'badge-completed';
      break;
    case 'Cancelled':
      className += 'badge-cancelled';
      break;
    default:
      className += 'badge-default';
  }

  return <span className={className}>{status}</span>;
};

export const PriorityBadge = ({ priority }) => {
  let className = 'priority-badge ';
  switch (priority) {
    case 'Critical':
      className += 'priority-critical';
      break;
    case 'High':
      className += 'priority-high';
      break;
    case 'Medium':
      className += 'priority-medium';
      break;
    case 'Low':
      className += 'priority-low';
      break;
    default:
      className += 'priority-default';
  }

  return <span className={className}>{priority}</span>;
};

export const EmployeeStatusBadge = ({ status }) => {
  let className = 'emp-status-badge ';
  switch (status) {
    case 'Active':
      className += 'emp-active';
      break;
    case 'Inactive':
      className += 'emp-inactive';
      break;
    case 'On Leave':
      className += 'emp-leave';
      break;
    default:
      className += 'emp-default';
  }

  return <span className={className}>{status}</span>;
};
