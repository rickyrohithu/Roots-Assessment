import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Building,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Edit2,
  Trash2,
  Tag,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  FileText,
} from 'lucide-react';
import { apiClient } from '../../api/apiClient';
import { StatusBadge, PriorityBadge } from '../../components/common/Badge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';

export const TaskView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchTaskDetails = async () => {
    try {
      const res = await apiClient.get(`/tasks/${id}`);
      setTask(res.data);
    } catch (err) {
      toastError(err.message || 'Task not found');
      navigate('/tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskDetails();
  }, [id]);

  const handleStatusTransition = async (newStatus) => {
    setStatusUpdating(true);
    try {
      const res = await apiClient.put(`/tasks/${id}/status`, { status: newStatus });
      success(`Status transitioned to "${newStatus}"`);
      setTask(res.data);
    } catch (err) {
      toastError(err.message || 'Invalid status transition');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleDeleteTask = async () => {
    setDeleting(true);
    try {
      await apiClient.delete(`/tasks/${id}`);
      success(`Task ${task.taskId} deleted successfully`);
      navigate('/tasks');
    } catch (err) {
      toastError(err.message || 'Failed to delete task');
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading task details..." />;
  }

  if (!task) return null;

  const employee = task.assignedEmployee || task.employeeSnapshot;
  const isCompleted = task.status === 'Completed';
  const isCancelled = task.status === 'Cancelled';
  const isTerminal = isCompleted || isCancelled;

  // Next valid statuses
  const validTransitions = task.validNextStatuses || [];

  return (
    <div className="view-page-container container animate-fade-in">
      {/* Top Navigation */}
      <div className="view-header-nav">
        <Link to="/tasks" className="back-link">
          <ArrowLeft size={16} />
          <span>Back to Tasks</span>
        </Link>
        <div className="view-action-group">
          {!isTerminal ? (
            <Link to={`/tasks/${id}/edit`} className="btn btn-secondary">
              <Edit2 size={15} />
              <span>Edit Task</span>
            </Link>
          ) : (
            <span className="badge-locked" title="Completed and Cancelled tasks cannot be edited">
              Task Locked
            </span>
          )}
          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="btn btn-danger-outline"
          >
            <Trash2 size={15} />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Overdue Alert Banner if overdue */}
      {task.isOverdue && (
        <div className="overdue-hero-banner animate-shake">
          <AlertCircle size={20} />
          <div>
            <strong>This task is Overdue!</strong>
            <p>
              Due date was {new Date(task.dueDate).toLocaleDateString()} and task status is currently{' '}
              {task.status}.
            </p>
          </div>
        </div>
      )}

      {/* Main Task Header Card */}
      <div className="card view-main-card">
        <div className="view-card-top">
          <div className="view-id-badge">{task.taskId}</div>
          <div className="view-badges">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            <span className="department-badge">{task.department}</span>
          </div>
        </div>

        <h1 className="view-task-title">{task.title}</h1>

        {/* Status Transition Quick-Action Bar */}
        {!isTerminal && validTransitions.length > 0 && (
          <div className="status-flow-box">
            <span className="status-flow-label">Next Valid Actions:</span>
            <div className="status-flow-buttons">
              {validTransitions.map((nextStatus) => (
                <button
                  key={nextStatus}
                  onClick={() => handleStatusTransition(nextStatus)}
                  disabled={statusUpdating}
                  className={`btn btn-sm btn-status-transition transition-to-${nextStatus
                    .toLowerCase()
                    .replace(/\s+/g, '-')}`}
                >
                  <ArrowRight size={14} />
                  <span>Mark as {nextStatus}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {isCompleted && task.completedDate && (
          <div className="completed-info-banner">
            <CheckCircle2 size={18} className="text-emerald" />
            <span>
              Completed on{' '}
              <strong>{new Date(task.completedDate).toLocaleString()}</strong> (timestamped by server)
            </span>
          </div>
        )}
      </div>

      {/* Two Column Layout: Description & Timeline | Assigned Employee */}
      <div className="view-two-col-grid mt-6">
        {/* Left Column: Description & Timeline */}
        <div className="view-col-main">
          {/* Description */}
          <div className="card mb-6">
            <div className="card-header">
              <h3 className="card-title flex-align-center">
                <FileText size={18} className="mr-2 text-primary" />
                Description
              </h3>
            </div>
            <div className="card-body">
              {task.description ? (
                <p className="description-text">{task.description}</p>
              ) : (
                <p className="text-muted italic">No description provided for this task.</p>
              )}
            </div>
          </div>

          {/* Timeline & Schedule */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title flex-align-center">
                <Calendar size={18} className="mr-2 text-primary" />
                Schedule & Timeline
              </h3>
            </div>
            <div className="timeline-grid">
              <div className="timeline-item">
                <span className="timeline-label">Created Date</span>
                <span className="timeline-value">
                  {new Date(task.createdAt).toLocaleDateString()}
                </span>
                <span className="timeline-sub">
                  {new Date(task.createdAt).toLocaleTimeString()}
                </span>
              </div>

              <div className="timeline-item">
                <span className="timeline-label">Start Date</span>
                <span className="timeline-value">
                  {new Date(task.startDate).toLocaleDateString()}
                </span>
              </div>

              <div className={`timeline-item ${task.isOverdue ? 'timeline-item-overdue' : ''}`}>
                <span className="timeline-label">Due Date</span>
                <span className="timeline-value font-semibold">
                  {new Date(task.dueDate).toLocaleDateString()}
                </span>
                {task.isOverdue && <span className="overdue-pill">Overdue</span>}
              </div>

              <div className="timeline-item">
                <span className="timeline-label">Completed Date</span>
                <span className="timeline-value">
                  {task.completedDate ? (
                    new Date(task.completedDate).toLocaleDateString()
                  ) : (
                    <span className="text-muted">-</span>
                  )}
                </span>
                {task.completedDate && (
                  <span className="timeline-sub">
                    {new Date(task.completedDate).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Assigned Employee */}
        <div className="view-col-side">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title flex-align-center">
                <User size={18} className="mr-2 text-primary" />
                Assigned Employee
              </h3>
            </div>
            <div className="card-body">
              {employee ? (
                <div className="employee-profile-card">
                  <div className="profile-avatar-large">
                    {employee.fullName
                      ? employee.fullName
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .substring(0, 2)
                          .toUpperCase()
                      : 'EM'}
                  </div>
                  <h4 className="profile-name">{employee.fullName}</h4>
                  <p className="profile-role">{employee.role}</p>
                  <p className="profile-dept">{employee.department} Department</p>

                  <div className="profile-meta-list">
                    <div className="profile-meta-row">
                      <span className="meta-label">Employee ID:</span>
                      <span className="meta-val font-mono">{employee.employeeId}</span>
                    </div>
                    <div className="profile-meta-row">
                      <span className="meta-label">Email:</span>
                      <span className="meta-val">{employee.email}</span>
                    </div>
                    {employee.phone && (
                      <div className="profile-meta-row">
                        <span className="meta-label">Phone:</span>
                        <span className="meta-val">{employee.phone}</span>
                      </div>
                    )}
                  </div>

                  {employee._id && (
                    <Link
                      to={`/employees/${employee._id}`}
                      className="btn btn-secondary btn-block mt-4"
                    >
                      <span>View Full Employee Profile</span>
                      <ArrowRight size={14} />
                    </Link>
                  )}
                </div>
              ) : (
                <div className="text-muted p-4 text-center">
                  Employee information not available.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Task"
        message={`Are you sure you want to delete task "${task.taskId}: ${task.title}"?`}
        confirmText="Delete Task"
        loading={deleting}
        onConfirm={handleDeleteTask}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
};
