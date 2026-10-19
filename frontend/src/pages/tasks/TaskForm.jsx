import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, AlertCircle, Calendar, User, Building, AlertTriangle } from 'lucide-react';
import { apiClient } from '../../api/apiClient';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';

const DEPARTMENTS = ['Development', 'Design', 'QA', 'HR', 'Sales'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

export const TaskForm = () => {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    assignedEmployee: '',
    department: '',
    priority: 'Medium',
    startDate: '',
    dueDate: '',
    description: '',
  });

  // Backend error state (shown in the mockup banner)
  const [backendError, setBackendError] = useState('');
  const [clientErrors, setClientErrors] = useState({});
  const [isLocked, setIsLocked] = useState(false);
  const [taskStatus, setTaskStatus] = useState('Todo');

  // Load assignable employees list
  const loadEmployees = async (startDateVal = '') => {
    try {
      const res = await apiClient.get('/employees/options/assignable', {
        startDate: startDateVal || undefined,
      });
      setEmployees(res.data);
    } catch (err) {
      toastError('Could not load employees list');
    } finally {
      setLoadingEmployees(false);
    }
  };

  useEffect(() => {
    loadEmployees(formData.startDate);
  }, [formData.startDate]);

  // Load existing task details if in edit mode
  useEffect(() => {
    if (isEditMode) {
      const fetchTask = async () => {
        try {
          const res = await apiClient.get(`/tasks/${id}`);
          const task = res.data;

          if (task.status === 'Completed' || task.status === 'Cancelled') {
            setIsLocked(true);
            setTaskStatus(task.status);
            setBackendError(
              `This task is currently "${task.status}". Completed and Cancelled tasks cannot be edited.`
            );
          }

          setFormData({
            title: task.title || '',
            assignedEmployee: task.assignedEmployee?._id || '',
            department: task.department || '',
            priority: task.priority || 'Medium',
            startDate: task.startDate ? task.startDate.split('T')[0] : '',
            dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
            description: task.description || '',
          });
          setTaskStatus(task.status);
        } catch (err) {
          toastError(err.message || 'Failed to load task details');
          navigate('/tasks');
        } finally {
          setLoading(false);
        }
      };
      fetchTask();
    }
  }, [id, isEditMode, navigate]);

  // Handle Input Changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setBackendError('');
    if (clientErrors[name]) {
      setClientErrors((prev) => ({ ...prev, [name]: null }));
    }

    // Auto sync department if an employee is selected and department is empty
    if (name === 'assignedEmployee') {
      const selectedEmp = employees.find((emp) => emp._id === value);
      if (selectedEmp && !formData.department) {
        setFormData((prev) => ({ ...prev, department: selectedEmp.department }));
      }
    }
  };

  // Client-side validations
  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) errors.title = 'Title is required';
    if (!formData.assignedEmployee) errors.assignedEmployee = 'Please select an employee';
    if (!formData.department) errors.department = 'Please select a department';
    if (!formData.startDate) errors.startDate = 'Start date is required';
    if (!formData.dueDate) errors.dueDate = 'Due date is required';

    if (formData.startDate && formData.dueDate) {
      if (new Date(formData.dueDate) < new Date(formData.startDate)) {
        errors.dueDate = 'Due Date cannot be earlier than Start Date';
      }
    }

    setClientErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setBackendError('');

    if (isLocked) {
      toastError(`Cannot edit a ${taskStatus} task.`);
      return;
    }

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      if (isEditMode) {
        await apiClient.put(`/tasks/${id}`, formData);
        success('Task updated successfully');
      } else {
        await apiClient.post('/tasks', formData);
        success('Task created successfully');
      }
      navigate('/tasks');
    } catch (err) {
      // Show backend business rule error in the designated banner box
      const msg = err.message || 'An error occurred while saving the task.';
      setBackendError(msg);
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading task details..." />;
  }

  // Selected employee information
  const selectedEmp = employees.find((e) => e._id === formData.assignedEmployee);

  return (
    <div className="form-page-container container animate-fade-in">
      <div className="form-back-nav">
        <Link to="/tasks" className="back-link">
          <ArrowLeft size={16} />
          <span>Back to Tasks</span>
        </Link>
      </div>

      <div className="form-card">
        <div className="form-card-header">
          <h1 className="form-title">{isEditMode ? 'Edit Task' : 'Add Task'}</h1>
          <p className="form-subtitle">
            {isEditMode
              ? 'Update task details. Status transitions must be performed on the task details page.'
              : 'Create a new task and assign it to an eligible team member.'}
          </p>
        </div>

        {/* Backend Error Banner (Exact pattern from Page 3 Screenshot) */}
        {backendError && (
          <div className="form-error-wrapper">
            <ErrorBanner message={backendError} onClose={() => setBackendError('')} />
          </div>
        )}

        {isLocked && (
          <div className="alert-locked-banner">
            <AlertTriangle size={18} />
            <span>
              This task is in terminal status ({taskStatus}). Business rules prevent modifying Completed
              or Cancelled tasks.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="standard-form">
          <div className="form-grid">
            {/* Title */}
            <div className="form-group">
              <label htmlFor="task-title" className="form-label">
                Title <span className="required-star">*</span>
              </label>
              <input
                id="task-title"
                name="title"
                type="text"
                placeholder="Enter Title"
                value={formData.title}
                onChange={handleChange}
                disabled={isLocked || submitting}
                className={`form-input ${clientErrors.title ? 'input-error' : ''}`}
              />
              {clientErrors.title && <span className="field-error-msg">{clientErrors.title}</span>}
            </div>

            {/* Assigned Employee */}
            <div className="form-group">
              <label htmlFor="task-employee" className="form-label">
                Assigned Employee <span className="required-star">*</span>
              </label>
              <select
                id="task-employee"
                name="assignedEmployee"
                value={formData.assignedEmployee}
                onChange={handleChange}
                disabled={isLocked || submitting || loadingEmployees}
                className={`form-select ${clientErrors.assignedEmployee ? 'input-error' : ''}`}
              >
                <option value="">Select...</option>
                {employees.map((emp) => {
                  const isCurrentAssignee = isEditMode && emp._id === formData.assignedEmployee;
                  const isOverCap = emp.activeTasksCount >= 3 && !isCurrentAssignee;
                  return (
                    <option
                      key={emp._id}
                      value={emp._id}
                    >
                      {emp.fullName} ({emp.department} • {emp.activeTasksCount}/3 active tasks)
                      {isOverCap ? ' - (At Capacity)' : ''}
                      {emp.status === 'On Leave' ? ' - (On Leave)' : ''}
                    </option>
                  );
                })}
              </select>
              {clientErrors.assignedEmployee && (
                <span className="field-error-msg">{clientErrors.assignedEmployee}</span>
              )}
              {selectedEmp && (
                <div className="employee-hint-text">
                  <span>
                    Current workload: <strong>{selectedEmp.activeTasksCount}/3 active tasks</strong>
                  </span>
                  {selectedEmp.status === 'On Leave' && (
                    <span className="text-amber ml-2">
                      (On leave: {new Date(selectedEmp.leaveStart).toLocaleDateString()} to{' '}
                      {new Date(selectedEmp.leaveEnd).toLocaleDateString()})
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Priority */}
            <div className="form-group">
              <label htmlFor="task-priority" className="form-label">
                Priority <span className="required-star">*</span>
              </label>
              <select
                id="task-priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                disabled={isLocked || submitting}
                className="form-select"
              >
                <option value="">Select...</option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Department */}
            <div className="form-group">
              <label htmlFor="task-department" className="form-label">
                Department <span className="required-star">*</span>
              </label>
              <select
                id="task-department"
                name="department"
                value={formData.department}
                onChange={handleChange}
                disabled={isLocked || submitting}
                className={`form-select ${clientErrors.department ? 'input-error' : ''}`}
              >
                <option value="">Select...</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              {clientErrors.department && (
                <span className="field-error-msg">{clientErrors.department}</span>
              )}
            </div>

            {/* Start Date */}
            <div className="form-group">
              <label htmlFor="task-start-date" className="form-label">
                Start Date <span className="required-star">*</span>
              </label>
              <input
                id="task-start-date"
                name="startDate"
                type="date"
                value={formData.startDate}
                onChange={handleChange}
                disabled={isLocked || submitting}
                className={`form-input ${clientErrors.startDate ? 'input-error' : ''}`}
              />
              {clientErrors.startDate && (
                <span className="field-error-msg">{clientErrors.startDate}</span>
              )}
            </div>

            {/* Due Date */}
            <div className="form-group">
              <label htmlFor="task-due-date" className="form-label">
                Due Date <span className="required-star">*</span>
              </label>
              <input
                id="task-due-date"
                name="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={handleChange}
                disabled={isLocked || submitting}
                className={`form-input ${clientErrors.dueDate ? 'input-error' : ''}`}
              />
              {clientErrors.dueDate && (
                <span className="field-error-msg">{clientErrors.dueDate}</span>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="form-group full-width mt-4">
            <label htmlFor="task-description" className="form-label">
              Description
            </label>
            <textarea
              id="task-description"
              name="description"
              rows={4}
              placeholder="Enter Description"
              value={formData.description}
              onChange={handleChange}
              disabled={isLocked || submitting}
              className="form-textarea"
            ></textarea>
          </div>

          {/* Submit Button (Maroon/brand color matching design) */}
          <div className="form-submit-row">
            <button
              type="submit"
              disabled={isLocked || submitting}
              className="btn btn-submit-primary"
            >
              {submitting ? 'Submitting...' : isEditMode ? 'Update Task' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
