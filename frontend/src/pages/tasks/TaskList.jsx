import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Download,
  MoreVertical,
  Eye,
  Edit2,
  Trash2,
  Filter,
  X,
  AlertCircle,
  ArrowUpDown,
  Calendar,
} from 'lucide-react';
import { apiClient } from '../../api/apiClient';
import { StatusDropdown } from '../../components/common/StatusDropdown';
import { PriorityBadge } from '../../components/common/Badge';
import { Pagination } from '../../components/common/Pagination';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';

const DEPARTMENTS = ['All', 'Development', 'Design', 'QA', 'HR', 'Sales'];
const PRIORITIES = ['All', 'Low', 'Medium', 'High', 'Critical'];
const STATUSES = ['All', 'Todo', 'In Progress', 'Completed', 'Cancelled'];

export const TaskList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { success, error } = useToast();

  // Read URL query parameters as single source of truth
  const search = searchParams.get('search') || '';
  const department = searchParams.get('department') || 'All';
  const priority = searchParams.get('priority') || 'All';
  const status = searchParams.get('status') || 'All';
  const dueFrom = searchParams.get('dueFrom') || '';
  const dueTo = searchParams.get('dueTo') || '';
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  // Local search input state before submitting/pressing Enter
  const [searchInput, setSearchInput] = useState(search);
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Action Menu dropdown state
  const [activeMenuId, setActiveMenuId] = useState(null);
  const menuRef = useRef(null);

  // Delete Modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Keep local search input synced with URL when URL changes
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Close action menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper to update URL params
  const updateParams = (newParams) => {
    const current = Object.fromEntries(searchParams.entries());
    const merged = { ...current, ...newParams };

    // Clean up defaults
    Object.keys(merged).forEach((k) => {
      if (
        merged[k] === '' ||
        merged[k] === null ||
        merged[k] === undefined ||
        (k === 'department' && merged[k] === 'All') ||
        (k === 'priority' && merged[k] === 'All') ||
        (k === 'status' && merged[k] === 'All') ||
        (k === 'sortBy' && merged[k] === 'createdAt') ||
        (k === 'sortOrder' && merged[k] === 'desc') ||
        (k === 'limit' && merged[k] === '10')
      ) {
        delete merged[k];
      }
    });

    setSearchParams(merged);
  };

  // Fetch tasks whenever URL search parameters change
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = {
        search,
        department,
        priority,
        status,
        dueFrom,
        dueTo,
        sortBy,
        sortOrder,
        page,
        limit,
      };

      const res = await apiClient.get('/tasks', params);
      setTasks(res.data);
      setPagination(res.pagination);
    } catch (err) {
      error(err.message || 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [search, department, priority, status, dueFrom, dueTo, sortBy, sortOrder, page, limit]);

  // Handlers
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateParams({ search: searchInput.trim(), page: 1 });
  };

  const handleClearSearch = () => {
    setSearchInput('');
    updateParams({ search: '', page: 1 });
  };

  const handleDepartmentChange = (e) => {
    updateParams({ department: e.target.value, page: 1 });
  };

  const handlePriorityChange = (e) => {
    updateParams({ priority: e.target.value, page: 1 });
  };

  const handleStatusChange = (e) => {
    updateParams({ status: e.target.value, page: 1 });
  };

  const handleDateFilterChange = (field, val) => {
    updateParams({ [field]: val, page: 1 });
  };

  const handleSortChange = (e) => {
    updateParams({ sortBy: e.target.value, page: 1 });
  };

  const toggleSortOrder = () => {
    updateParams({ sortOrder: sortOrder === 'asc' ? 'desc' : 'asc', page: 1 });
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearchParams({});
  };

  const handlePageChange = (newPage) => {
    updateParams({ page: newPage });
  };

  // CSV Export: downloads all tasks matching current filters
  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const params = {
        search,
        department,
        priority,
        status,
        dueFrom,
        dueTo,
        sortBy,
        sortOrder,
      };
      await apiClient.downloadCSV('/tasks/export/csv', params, `tasks_export_${Date.now()}.csv`);
      success('CSV export generated and downloaded successfully.');
    } catch (err) {
      error(err.message || 'CSV export failed');
    } finally {
      setExporting(false);
    }
  };

  // Task Status updated from table dropdown
  const handleTaskStatusChanged = (updatedTask) => {
    setTasks((prev) =>
      prev.map((t) => (t._id === updatedTask._id ? { ...t, status: updatedTask.status, completedDate: updatedTask.completedDate } : t))
    );
  };

  // Delete Task
  const openDeleteModal = (task) => {
    setTaskToDelete(task);
    setActiveMenuId(null);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/tasks/${taskToDelete._id}`);
      success(`Task "${taskToDelete.taskId}" deleted.`);
      setDeleteModalOpen(false);
      setTaskToDelete(null);
      fetchTasks();
    } catch (err) {
      error(err.message || 'Failed to delete task');
    } finally {
      setDeleting(false);
    }
  };

  // Format Due Date helper e.g. "05 Oct (Overdue)"
  const formatDueDate = (dateStr, isOverdue) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-US', { month: 'short' });
    const formatted = `${day} ${month}`;

    if (isOverdue) {
      return (
        <span className="due-date-overdue">
          {formatted} <strong>(Overdue)</strong>
        </span>
      );
    }
    return <span className="due-date-normal">{formatted}</span>;
  };

  const hasActiveFilters =
    Boolean(search) ||
    department !== 'All' ||
    priority !== 'All' ||
    status !== 'All' ||
    Boolean(dueFrom) ||
    Boolean(dueTo) ||
    sortBy !== 'createdAt';

  return (
    <div className="task-list-page container animate-fade-in">
      {/* Top Controls Row (Matches Page 3 Mockup) */}
      <div className="task-action-bar">
        {/* Search bar */}
        <form onSubmit={handleSearchSubmit} className="search-box-form">
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search title or employee"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="search-input"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="search-clear-btn"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button type="submit" className="btn btn-search">
            Search
          </button>
        </form>

        {/* Buttons */}
        <div className="task-action-buttons">
          <Link to="/tasks/new" className="btn btn-primary">
            <Plus size={16} />
            <span>+ Add Task</span>
          </Link>
          <button
            type="button"
            onClick={handleExportCSV}
            className="btn btn-secondary"
            disabled={exporting}
            title="Export all filtered tasks to CSV"
          >
            <Download size={16} />
            <span>{exporting ? 'Exporting...' : 'Export To Csv'}</span>
          </button>
        </div>
      </div>

      {/* Filters Row (Department, Priority, Status, Due date range, Sort) */}
      <div className="filters-row">
        <div className="filter-group">
          <label htmlFor="dept-filter" className="filter-label">Department</label>
          <select
            id="dept-filter"
            value={department}
            onChange={handleDepartmentChange}
            className="filter-select"
          >
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d === 'All' ? 'Department' : d}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="priority-filter" className="filter-label">Priority</label>
          <select
            id="priority-filter"
            value={priority}
            onChange={handlePriorityChange}
            className="filter-select"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p === 'All' ? 'Priority' : p}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="status-filter" className="filter-label">Status</label>
          <select
            id="status-filter"
            value={status}
            onChange={handleStatusChange}
            className="filter-select"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === 'All' ? 'Status' : s}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group date-range-group">
          <label className="filter-label">Due: from - to</label>
          <div className="date-inputs-wrapper">
            <input
              type="date"
              value={dueFrom}
              onChange={(e) => handleDateFilterChange('dueFrom', e.target.value)}
              className="filter-date-input"
              title="Due date from"
            />
            <span className="date-sep">-</span>
            <input
              type="date"
              value={dueTo}
              onChange={(e) => handleDateFilterChange('dueTo', e.target.value)}
              className="filter-date-input"
              title="Due date to"
            />
          </div>
        </div>

        <div className="filter-group sort-group">
          <label htmlFor="sort-filter" className="filter-label">Sort By</label>
          <div className="sort-controls">
            <select
              id="sort-filter"
              value={sortBy}
              onChange={handleSortChange}
              className="filter-select"
            >
              <option value="createdAt">Created Date</option>
              <option value="dueDate">Due Date</option>
              <option value="priority">Priority (Importance)</option>
              <option value="title">Title</option>
            </select>
            <button
              type="button"
              onClick={toggleSortOrder}
              className="sort-order-btn"
              title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              <ArrowUpDown size={14} />
              <span>{sortOrder.toUpperCase()}</span>
            </button>
          </div>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="btn btn-ghost btn-sm reset-filters-btn"
            title="Reset all search & filters"
          >
            <X size={14} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Task Table Card */}
      <div className="card task-table-card mt-4">
        {loading ? (
          <LoadingSpinner text="Fetching tasks..." />
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <AlertCircle size={40} className="empty-icon text-muted" />
            <h3 className="empty-title">No tasks found</h3>
            <p className="empty-desc">
              {hasActiveFilters
                ? 'No tasks match your current search and filter criteria.'
                : 'Get started by creating your first task.'}
            </p>
            {hasActiveFilters ? (
              <button onClick={handleResetFilters} className="btn btn-secondary btn-sm mt-3">
                Clear Filters
              </button>
            ) : (
              <Link to="/tasks/new" className="btn btn-primary btn-sm mt-3">
                <Plus size={15} />
                <span>+ Add Task</span>
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
                  <th>Employee</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const empName =
                    task.assignedEmployee?.fullName ||
                    task.employeeSnapshot?.fullName ||
                    'Deleted / Unassigned';
                  const empId = task.assignedEmployee?._id;
                  const isCompletedOrCancelled =
                    task.status === 'Completed' || task.status === 'Cancelled';

                  return (
                    <tr key={task._id} className={task.isOverdue ? 'row-overdue' : ''}>
                      <td className="font-mono font-semibold text-secondary">
                        <Link to={`/tasks/${task._id}`} className="task-id-link">
                          {task.taskId}
                        </Link>
                      </td>
                      <td className="task-title-cell">
                        <Link to={`/tasks/${task._id}`} className="task-title-link">
                          {task.title}
                        </Link>
                      </td>
                      <td>
                        {empId ? (
                          <Link to={`/employees/${empId}`} className="employee-link">
                            {empName}
                          </Link>
                        ) : (
                          <span className="text-muted">{empName}</span>
                        )}
                      </td>
                      <td>
                        <PriorityBadge priority={task.priority} />
                      </td>
                      <td>
                        <StatusDropdown
                          taskId={task._id}
                          currentStatus={task.status}
                          onStatusChange={handleTaskStatusChanged}
                        />
                      </td>
                      <td>{formatDueDate(task.dueDate, task.isOverdue)}</td>
                      <td className="text-right action-col">
                        <div
                          className="action-menu-container"
                          ref={activeMenuId === task._id ? menuRef : null}
                        >
                          <button
                            type="button"
                            className="btn-action-trigger"
                            onClick={() =>
                              setActiveMenuId(activeMenuId === task._id ? null : task._id)
                            }
                            aria-label="Actions"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {activeMenuId === task._id && (
                            <div className="action-popover animate-pop">
                              <Link
                                to={`/tasks/${task._id}`}
                                className="action-popover-item"
                                onClick={() => setActiveMenuId(null)}
                              >
                                <Eye size={14} />
                                <span>View</span>
                              </Link>

                              {!isCompletedOrCancelled ? (
                                <Link
                                  to={`/tasks/${task._id}/edit`}
                                  className="action-popover-item"
                                  onClick={() => setActiveMenuId(null)}
                                >
                                  <Edit2 size={14} />
                                  <span>Edit</span>
                                </Link>
                              ) : (
                                <span
                                  className="action-popover-item disabled"
                                  title="Completed and Cancelled tasks cannot be edited"
                                >
                                  <Edit2 size={14} />
                                  <span>Edit (Locked)</span>
                                </span>
                              )}

                              <button
                                type="button"
                                className="action-popover-item text-danger"
                                onClick={() => openDeleteModal(task)}
                              >
                                <Trash2 size={14} />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && pagination.total > 0 && (
          <Pagination
            total={pagination.total}
            page={pagination.page}
            limit={pagination.limit}
            onPageChange={handlePageChange}
            itemLabel="tasks"
          />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Task"
        message={`Are you sure you want to delete task "${taskToDelete?.taskId}: ${taskToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete Task"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setTaskToDelete(null);
        }}
      />
    </div>
  );
};
