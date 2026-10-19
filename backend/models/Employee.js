const mongoose = require('mongoose');

const DEPARTMENTS = ['Development', 'Design', 'QA', 'HR', 'Sales'];
const STATUSES = ['Active', 'Inactive', 'On Leave'];

const employeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      enum: {
        values: DEPARTMENTS,
        message: '{VALUE} is not a valid department',
      },
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      trim: true,
    },
    joiningDate: {
      type: Date,
      required: [true, 'Joining Date is required'],
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: STATUSES,
        message: '{VALUE} is not a valid status',
      },
      default: 'Active',
    },
    skills: {
      type: [String],
      default: [],
    },
    leaveStart: {
      type: Date,
      validate: {
        validator: function (val) {
          if (this.status === 'On Leave') {
            return val != null;
          }
          return true;
        },
        message: 'Leave Start date is required when employee is On Leave',
      },
    },
    leaveEnd: {
      type: Date,
      validate: {
        validator: function (val) {
          if (this.status === 'On Leave') {
            return val != null && (!this.leaveStart || val >= this.leaveStart);
          }
          return true;
        },
        message: 'Leave End date must be on or after Leave Start date when On Leave',
      },
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Secondary indexes
employeeSchema.index({ department: 1 });
employeeSchema.index({ status: 1 });

module.exports = {
  Employee: mongoose.model('Employee', employeeSchema),
  DEPARTMENTS,
  STATUSES,
};
