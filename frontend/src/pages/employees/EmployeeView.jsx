import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Phone,
  Building,
  Briefcase,
  Calendar,
  CheckSquare,
  Clock,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Award,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { apiClient } from '../../api/apiClient';
import { EmployeeStatusBadge, StatusBadge, PriorityBadge } from '../../components/common/Badge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';

export const EmployeeView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'history'

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchEmployeeDetails = async () => {
    try {
      const res = await apiClient.get(`/employees/${id}`);
      setEmployee(res.data);
    } catch (err) {
      toastError(err.message || 'Employee not found');
      navigate('/employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeeDetails();
  }, [id]);

  const handleDelete = async () => {
    if (!employee) return;
    if (employee.stats.active > 0) {
      toastError(
        `Cannot delete employee with active tasks: ${employee.fullName} currently has ${employee.stats.active} active task(s).`
      );
      setDeleteModalOpen(false);
      return;
    }

    setDeleting(true);
    try {
      const res = await apiClient.delete(`/employees/${id}`);
      success(res.message || 'Employee deleted successfully');
      navigate('/employees');
    } catch (err) {
      toastError(err.message || 'Failed to delete employee');
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading employee profile..." />;
  }

  if (!employee) return null;

  const activeTasks = employee.tasks?.filter((t) => t.status === 'Todo' || t.status === 'In Progress') || [];
  const historyTasks = employee.tasks?.filter((t) => t.status === 'Completed' || t.status === 'Cancelled') || [];
  const isMaxCapacity = activeTasks.length >= 3;

  return (
    <div className="view-page-container container animate-fade-in">
      {/* Top Navigation */}
      <div className="view-header-nav">
        <Link to="/employees" className="back-link">
          <ArrowLeft size={16} />
          <span>Back to Employees</span>
        </Link>
        <div className="view-action-group">
          {!isMaxCapacity && employee.status !== 'Inactive' && (
            <Link to={`/tasks/new`} className="btn btn-primary">
              <Plus size={15} />
              <span>Assign Task</span>
            </Link>
          )}
          <Link to={`/employees/${id}/edit`} className="btn btn-secondary">
            <Edit2 size={15} />
            <span>Edit Profile</span>
          </Link>
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

      {/* Main Employee Profile Banner */}
      <div className="card emp-hero-card">
        <div className="emp-hero-left">
          <div className="avatar-xl">
            {employee.fullName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .substring(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <div className="emp-id-pill">{employee.employeeId}</div>
            <h1 className="emp-hero-name">{employee.fullName}</h1>
            <p className="emp-hero-role">
              {employee.role} • <span className="text-secondary">{employee.department}</span>
            </p>
            <div className="emp-hero-badges mt-2">
              <EmployeeStatusBadge status={employee.status} />
              {employee.status === 'On Leave' && employee.leaveStart && employee.leaveEnd && (
                <span className="on-leave-date-pill">
                  Leave: {new Date(employee.leaveStart).toLocaleDateString()} to{' '}
                  {new Date(employee.leaveEnd).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Capacity / Workload Indicator Box */}
        <div className="emp-hero-workload">
          <div className="workload-box-header">
            <span className="workload-box-title">Active Workload Capacity</span>
            <span className={`workload-fraction ${isMaxCapacity ? 'text-danger font-bold' : ''}`}>
              {activeTasks.length} / 3 Tasks
            </span>
          </div>

          <div className="capacity-bar-track">
            <div
              className={`capacity-bar-fill ${
                isMaxCapacity
                  ? 'fill-danger'
                  : activeTasks.length === 2
                  ? 'fill-warning'
                  : 'fill-primary'
              }`}
              style={{ width: `${(activeTasks.length / 3) * 100}%` }}
            ></div>
          </div>

          <p className="workload-status-desc">
            {isMaxCapacity ? (
              <span className="text-danger flex-align-center">
                <AlertTriangle size={14} className="mr-1" /> Maximum capacity reached. Cannot accept new tasks.
              </span>
            ) : employee.status === 'Inactive' ? (
              <span className="text-muted">Employee is Inactive. Cannot be assigned tasks.</span>
            ) : (
              <span className="text-emerald">
                Available to accept {3 - activeTasks.length} more active task(s).
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Profile Details & Skills Grid */}
      <div className="view-two-col-grid mt-6">
        {/* Left Column: Contact & Metadata */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Employee Details</h3>
          </div>
          <div className="profile-meta-list p-4">
            <div className="profile-meta-row">
              <span className="meta-label flex-align-center">
                <Mail size={15} className="mr-2 text-muted" /> Email
              </span>
              <span className="meta-val font-semibold">{employee.email}</span>
            </div>
            <div className="profile-meta-row">
              <span className="meta-label flex-align-center">
                <Phone size={15} className="mr-2 text-muted" /> Phone
              </span>
              <span className="meta-val">{employee.phone}</span>
            </div>
            <div className="profile-meta-row">
              <span className="meta-label flex-align-center">
                <Building size={15} className="mr-2 text-muted" /> Department
              </span>
              <span className="meta-val">{employee.department}</span>
            </div>
            <div className="profile-meta-row">
              <span className="meta-label flex-align-center">
                <Briefcase size={15} className="mr-2 text-muted" /> Role
              </span>
              <span className="meta-val">{employee.role}</span>
            </div>
            <div className="profile-meta-row">
              <span className="meta-label flex-align-center">
                <Calendar size={15} className="mr-2 text-muted" /> Joining Date
              </span>
              <span className="meta-val">
                {new Date(employee.joiningDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Skills & Summary */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title flex-align-center">
              <Award size={18} className="mr-2 text-primary" />
              Skills & Expertise
            </h3>
          </div>
          <div className="card-body p-4">
            {employee.skills && employee.skills.length > 0 ? (
              <div className="skills-badge-list">
                {employee.skills.map((skill) => (
                  <span key={skill} className="skill-chip-static">
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-muted italic">No skills specified.</p>
            )}

            <div className="task-summary-counters mt-6">
              <div className="summary-counter-item">
                <span className="summary-num text-blue">{employee.stats?.active || 0}</span>
                <span className="summary-label">Active Tasks</span>
              </div>
              <div className="summary-counter-item">
                <span className="summary-num text-emerald">{employee.stats?.completed || 0}</span>
                <span className="summary-label">Completed</span>
              </div>
              <div className="summary-counter-item">
                <span className="summary-num text-rose">{employee.stats?.cancelled || 0}</span>
                <span className="summary-label">Cancelled</span>
              </div>
              <div className="summary-counter-item">
                <span className="summary-num text-primary">{employee.stats?.total || 0}</span>
                <span className="summary-label">Total Assigned</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assigned Tasks Tabs Section */}
      <div className="card mt-6">
        <div className="card-tabs-header">
          <button
            type="button"
            className={`card-tab-btn ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            <span>Active Tasks</span>
            <span className="tab-count-pill">{activeTasks.length}</span>
          </button>
          <button
            type="button"
            className={`card-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <span>Task History (Completed / Cancelled)</span>
            <span className="tab-count-pill">{historyTasks.length}</span>
          </button>
        </div>

        <div className="card-body p-0">
          {activeTab === 'active' ? (
            activeTasks.length === 0 ? (
              <div className="empty-tab-state p-6 text-center text-muted">
                <CheckSquare size={36} className="text-muted mx-auto mb-2" />
                <p>No active tasks assigned to {employee.fullName}.</p>
                {!isMaxCapacity && employee.status !== 'Inactive' && (
                  <Link to="/tasks/new" className="btn btn-primary btn-sm mt-3">
                    + Assign a Task
                  </Link>
                )}
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Title</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Start Date</th>
                      <th>Due Date</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTasks.map((task) => (
                      <tr key={task._id} className={task.isOverdue ? 'row-overdue' : ''}>
                        <td className="font-mono font-semibold">
                          <Link to={`/tasks/${task._id}`} className="task-id-link">
                            {task.taskId}
                          </Link>
                        </td>
                        <td>
                          <Link to={`/tasks/${task._id}`} className="task-title-link">
                            {task.title}
                          </Link>
                        </td>
                        <td>
                          <PriorityBadge priority={task.priority} />
                        </td>
                        <td>
                          <StatusBadge status={task.status} />
                        </td>
                        <td>{new Date(task.startDate).toLocaleDateString()}</td>
                        <td>
                          {new Date(task.dueDate).toLocaleDateString()}
                          {task.isOverdue && (
                            <span className="due-date-overdue ml-2 font-bold">(Overdue)</span>
                          )}
                        </td>
                        <td className="text-right">
                          <Link to={`/tasks/${task._id}`} className="btn btn-ghost btn-sm">
                            <ExternalLink size={14} />
                            <span>View</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : historyTasks.length === 0 ? (
            <div className="empty-tab-state p-6 text-center text-muted">
              <Clock size={36} className="text-muted mx-auto mb-2" />
              <p>No past completed or cancelled tasks found for {employee.fullName}.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Due Date</th>
                    <th>Completed Date</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {historyTasks.map((task) => (
                    <tr key={task._id}>
                      <td className="font-mono font-semibold">
                        <Link to={`/tasks/${task._id}`} className="task-id-link">
                          {task.taskId}
                        </Link>
                      </td>
                      <td>
                        <Link to={`/tasks/${task._id}`} className="task-title-link">
                          {task.title}
                        </Link>
                      </td>
                      <td>
                        <PriorityBadge priority={task.priority} />
                      </td>
                      <td>
                        <StatusBadge status={task.status} />
                      </td>
                      <td>{new Date(task.dueDate).toLocaleDateString()}</td>
                      <td>
                        {task.completedDate
                          ? new Date(task.completedDate).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="text-right">
                        <Link to={`/tasks/${task._id}`} className="btn btn-ghost btn-sm">
                          <ExternalLink size={14} />
                          <span>View</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Employee"
        message={`Are you sure you want to delete ${employee.fullName}? If they have any active tasks, this action will be rejected.`}
        confirmText="Delete Employee"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
};
