import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  CheckSquare,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  ArrowRight,
  TrendingUp,
  Briefcase,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '../../api/apiClient';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';

export const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const { error } = useToast();

  const fetchDashboardData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await apiClient.get('/dashboard');
      setMetrics(response.data);
    } catch (err) {
      error(err.message || 'Failed to fetch dashboard metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return <LoadingSpinner text="Computing dashboard metrics from server..." />;
  }

  if (!metrics) {
    return (
      <div className="error-card container">
        <AlertCircle size={32} className="text-rose-500" />
        <p>Could not load dashboard data from backend.</p>
        <button onClick={() => fetchDashboardData()} className="btn btn-secondary mt-2">
          Retry
        </button>
      </div>
    );
  }

  const { employees, tasks, employeeWorkload, departmentDistribution } = metrics;

  return (
    <div className="dashboard-container container animate-fade-in">
      {/* Top Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">All metrics and employee workload calculated on the backend</p>
        </div>
        <div className="page-header-actions">
          <button
            onClick={() => fetchDashboardData(true)}
            className="btn btn-secondary btn-icon"
            disabled={refreshing}
            title="Refresh metrics from server"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <Link to="/tasks/new" className="btn btn-primary">
            <Plus size={16} />
            <span>+ Add Task</span>
          </Link>
        </div>
      </div>

      {/* Primary Metrics Grid (Matching PDF Layout) */}
      <div className="metrics-grid">
        {/* Card 1: Total Employees */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total Employees</span>
            <div className="stat-icon-wrapper icon-employees">
              <Users size={20} />
            </div>
          </div>
          <div className="stat-card-main-number">{employees.total}</div>
          <div className="stat-subgrid employee-subgrid">
            <div className="sub-stat">
              <span className="sub-stat-label">Active</span>
              <span className="sub-stat-value text-emerald">{employees.active}</span>
            </div>
            <div className="sub-stat">
              <span className="sub-stat-label">Inactive</span>
              <span className="sub-stat-value text-muted">{employees.inactive}</span>
            </div>
            <div className="sub-stat">
              <span className="sub-stat-label">On Leave</span>
              <span className="sub-stat-value text-amber">{employees.onLeave}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Tasks */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total Tasks</span>
            <div className="stat-icon-wrapper icon-tasks">
              <CheckSquare size={20} />
            </div>
          </div>
          <div className="stat-card-main-number">{tasks.total}</div>
          <div className="stat-subgrid task-subgrid">
            <div className="sub-stat">
              <span className="sub-stat-label">Todo</span>
              <span className="sub-stat-value text-slate">{tasks.todo}</span>
            </div>
            <div className="sub-stat">
              <span className="sub-stat-label">In Progress</span>
              <span className="sub-stat-value text-blue">{tasks.inProgress}</span>
            </div>
            <div className="sub-stat">
              <span className="sub-stat-label">Completed</span>
              <span className="sub-stat-value text-emerald">{tasks.completed}</span>
            </div>
            <div className="sub-stat">
              <span className="sub-stat-label">Cancelled</span>
              <span className="sub-stat-value text-rose">{tasks.cancelled}</span>
            </div>
            <div className="sub-stat stat-overdue">
              <span className="sub-stat-label">Overdue</span>
              <span className="sub-stat-value text-danger">{tasks.overdue}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Employee Workload Table Section (Matching Page 4 Layout) */}
      <div className="card workload-card mt-6">
        <div className="card-header flex-between">
          <div>
            <h2 className="card-title">Employee Workload</h2>
            <p className="card-subtitle">
              Active tasks (Todo + In Progress) per employee. Max allowed is 3.
            </p>
          </div>
          <Link to="/employees" className="card-link-more">
            <span>View all employees</span>
            <ArrowRight size={15} />
          </Link>
        </div>

        <div className="table-responsive">
          <table className="data-table workload-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th className="text-right">Active Tasks</th>
              </tr>
            </thead>
            <tbody>
              {employeeWorkload.length === 0 ? (
                <tr>
                  <td colSpan={2} className="empty-table-cell">
                    No active employees found.
                  </td>
                </tr>
              ) : (
                employeeWorkload.map((emp) => {
                  const isMax = emp.activeTasks >= 3;
                  return (
                    <tr key={emp._id} className={isMax ? 'row-highlight-max' : ''}>
                      <td>
                        <Link to={`/employees/${emp._id}`} className="employee-cell-link">
                          <div className="avatar-small">
                            {emp.fullName
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .substring(0, 2)
                              .toUpperCase()}
                          </div>
                          <div>
                            <span className="employee-name">{emp.fullName}</span>
                            <span className="employee-dept-badge">{emp.department} • {emp.role}</span>
                          </div>
                        </Link>
                      </td>
                      <td className="text-right">
                        <div className="workload-value-wrapper">
                          <div className="workload-meter">
                            <div
                              className={`workload-meter-fill ${
                                isMax ? 'fill-danger' : emp.activeTasks === 2 ? 'fill-warning' : 'fill-primary'
                              }`}
                              style={{ width: `${(emp.activeTasks / 3) * 100}%` }}
                            ></div>
                          </div>
                          <span className={`workload-number ${isMax ? 'text-danger font-bold' : ''}`}>
                            {emp.activeTasks}
                            {isMax && <span className="capacity-tag">Max</span>}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Department Breakdown Insights */}
      {departmentDistribution && departmentDistribution.length > 0 && (
        <div className="card mt-6">
          <div className="card-header">
            <h2 className="card-title">Department Task Distribution</h2>
            <p className="card-subtitle">Active and completed tasks across organizational units</p>
          </div>
          <div className="dept-distribution-grid">
            {departmentDistribution.map((d) => (
              <div key={d._id} className="dept-pill-card">
                <span className="dept-pill-name">{d._id}</span>
                <div className="dept-pill-stats">
                  <span>Total: <strong>{d.total}</strong></span>
                  <span className="dot-sep">•</span>
                  <span>Active: <strong className="text-blue">{d.active}</strong></span>
                  <span className="dot-sep">•</span>
                  <span>Done: <strong className="text-emerald">{d.completed}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
