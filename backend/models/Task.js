const mongoose = require('mongoose');

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const TASK_STATUSES = ['Todo', 'In Progress', 'Completed', 'Cancelled'];
const DEPARTMENTS = ['Development', 'Design', 'QA', 'HR', 'Sales'];

// Status transition state machine rules
const VALID_TRANSITIONS = {
  Todo: ['In Progress', 'Cancelled'],
  'In Progress': ['Completed', 'Cancelled'],
  Completed: [], // Completed cannot be edited / transitioned
  Cancelled: [], // Cancelled cannot be edited / transitioned
};

const taskSchema = new mongoose.Schema(
  {
    taskId: {
      type: String,
      unique: true,
      trim: true,
      uppercase: true,
    },
    title: {
      type: String,
      required: [true, 'Task Title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    assignedEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Assigned Employee is required'],
    },
    employeeSnapshot: {
      employeeId: String,
      fullName: String,
      email: String,
      department: String,
      role: String,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      enum: {
        values: DEPARTMENTS,
        message: '{VALUE} is not a valid department',
      },
    },
    priority: {
      type: String,
      required: [true, 'Priority is required'],
      enum: {
        values: PRIORITIES,
        message: '{VALUE} is not a valid priority',
      },
      default: 'Medium',
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: TASK_STATUSES,
        message: '{VALUE} is not a valid status',
      },
      default: 'Todo',
    },
    startDate: {
      type: Date,
      required: [true, 'Start Date is required'],
    },
    dueDate: {
      type: Date,
      required: [true, 'Due Date is required'],
      validate: {
        validator: function (val) {
          if (!this.startDate || !val) return true;
          // Normalizing to midnight for clean date comparison
          const s = new Date(this.startDate);
          s.setHours(0, 0, 0, 0);
          const d = new Date(val);
          d.setHours(0, 0, 0, 0);
          return d >= s;
        },
        message: 'Due Date cannot be earlier than Start Date',
      },
    },
    completedDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for overdue calculation
taskSchema.virtual('isOverdue').get(function () {
  if (this.status === 'Completed' || this.status === 'Cancelled') {
    return false;
  }
  if (!this.dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(this.dueDate);
  due.setHours(0, 0, 0, 0);
  return today > due;
});

// Secondary indexes for search, workload, and filters
taskSchema.index({ assignedEmployee: 1, status: 1 });
taskSchema.index({ department: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ createdAt: -1 });

module.exports = {
  Task: mongoose.model('Task', taskSchema),
  PRIORITIES,
  TASK_STATUSES,
  VALID_TRANSITIONS,
};
