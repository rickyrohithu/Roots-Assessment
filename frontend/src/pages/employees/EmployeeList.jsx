import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  MoreVertical,
  Eye,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Briefcase,
  UserCheck,
  UserX,
  Clock,
  ArrowUpDown,
} from 'lucide-react';
import { apiClient } from '../../api/apiClient';
import { EmployeeStatusBadge } from '../../components/common/Badge';
import { Pagination } from '../../components/common/Pagination';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';

const DEPARTMENTS = ['All', 'Development', 'Design', 'QA', 'HR', 'Sales'];
const STATUSES = ['All', 'Active', 'Inactive', 'On Leave'];

export const EmployeeList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { success, error } = useToast();

  const search = searchParams.get('search') || '';
  const department = searchParams.get('department') || 'All';
  const status = searchParams.get('status') || 'All';
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  const [searchInput, setSearchInput] = useState(search);
  const [employees, setEmployees] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Action popover
  const [activeMenuId, setActiveMenuId] = useState(null);
  const menuRef = useRef(null);

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [empToDelete, setEmpToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateParams = (newParams) => {
    const current = Object.fromEntries(searchParams.entries());
    const merged = { ...current, ...newParams };

    Object.keys(merged).forEach((k) => {
      if (
        merged[k] === '' ||
        merged[k] === null ||
        merged[k] === undefined ||
        (k === 'department' && merged[k] === 'All') ||
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

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = {
        search,
        department,
        status,
        sortBy,
        sortOrder,
        page,
        limit,
      };
      const res = await apiClient.get('/employees', params);
      setEmployees(res.data);
      setPagination(res.pagination);
    } catch (err) {
      error(err.message || 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [search, department, status, sortBy, sortOrder, page, limit]);

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

  const handleStatusChange = (e) => {
    updateParams({ status: e.target.value, page: 1 });
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearchParams({});
  };

  const handlePageChange = (newPage) => {
    updateParams({ page: newPage });
  };

  const openDeleteModal = (emp) => {
    setEmpToDelete(emp);
    setActiveMenuId(null);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!empToDelete) return;

    // Check client side quick hint if active tasks
    if (empToDelete.activeTasksCount > 0) {
      error(
        `Cannot delete employee: ${empToDelete.fullName} has ${empToDelete.activeTasksCount} active tasks. Please reassign or complete them first.`
      );
      setDeleteModalOpen(false);
      return;
    }

    setDeleting(true);
    try {
      const res = await apiClient.delete(`/employees/${empToDelete._id}`);
      success(res.message || `Employee "${empToDelete.fullName}" was removed.`);
      setDeleteModalOpen(false);
      setEmpToDelete(null);
      fetchEmployees();
    } catch (err) {
      error(err.message || 'Failed to delete employee');
    } finally {
      setDeleting(false);
    }
  };

  const hasActiveFilters =
    Boolean(search) || department !== 'All' || status !== 'All' || sortBy !== 'createdAt';

  return (
    <div className="employee-list-page container animate-fade-in">
      {/* Top Controls Row */}
      <div className="task-action-bar">
        <form onSubmit={handleSearchSubmit} className="search-box-form">
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search employee by name, ID, or email"
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

        <div className="task-action-buttons">
          <Link to="/employees/new" className="btn btn-primary">
            <Plus size={16} />
            <span>+ Add Employee</span>
          </Link>
        </div>
      </div>

      {/* Filters Row */}
      <div className="filters-row">
        <div className="filter-group">
          <label htmlFor="emp-dept-filter" className="filter-label">Department</label>
          <select
            id="emp-dept-filter"
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
          <label htmlFor="emp-status-filter" className="filter-label">Status</label>
          <select
            id="emp-status-filter"
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

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="btn btn-ghost btn-sm reset-filters-btn"
            title="Reset filters"
          >
            <X size={14} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Employee Table */}
      <div className="card task-table-card mt-4">
        {loading ? (
          <LoadingSpinner text="Fetching employees..." />
        ) : employees.length === 0 ? (
          <div className="empty-state">
            <AlertCircle size={40} className="empty-icon text-muted" />
            <h3 className="empty-title">No employees found</h3>
            <p className="empty-desc">
              {hasActiveFilters
                ? 'No employees match your search or filter criteria.'
                : 'Get started by adding your first employee.'}
            </p>
            {hasActiveFilters ? (
              <button onClick={handleResetFilters} className="btn btn-secondary btn-sm mt-3">
                Clear Filters
              </button>
            ) : (
              <Link to="/employees/new" className="btn btn-primary btn-sm mt-3">
                <Plus size={15} />
                <span>+ Add Employee</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Full Name</th>
                  <th>Department</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Active Workload</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => {
                  const isMax = emp.activeTasksCount >= 3;
                  return (
                    <tr key={emp._id}>
                      <td className="font-mono font-semibold text-secondary">
                        <Link to={`/employees/${emp._id}`} className="task-id-link">
                          {emp.employeeId}
                        </Link>
                      </td>
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
                            <span className="employee-email-sub">{emp.email}</span>
                          </div>
                        </Link>
                      </td>
                      <td>{emp.department}</td>
                      <td>{emp.role}</td>
                      <td>
                        <EmployeeStatusBadge status={emp.status} />
                        {emp.status === 'On Leave' && emp.leaveStart && emp.leaveEnd && (
                          <div className="leave-dates-sub">
                            {new Date(emp.leaveStart).toLocaleDateString()} -{' '}
                            {new Date(emp.leaveEnd).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="workload-value-wrapper">
                          <div className="workload-meter">
                            <div
                              className={`workload-meter-fill ${
                                isMax
                                  ? 'fill-danger'
                                  : emp.activeTasksCount === 2
                                  ? 'fill-warning'
                                  : 'fill-primary'
                              }`}
                              style={{ width: `${(emp.activeTasksCount / 3) * 100}%` }}
                            ></div>
                          </div>
                          <span className={`workload-number ${isMax ? 'text-danger font-bold' : ''}`}>
                            {emp.activeTasksCount}/3
                          </span>
                        </div>
                      </td>
                      <td className="text-right action-col">
                        <div
                          className="action-menu-container"
                          ref={activeMenuId === emp._id ? menuRef : null}
                        >
                          <button
                            type="button"
                            className="btn-action-trigger"
                            onClick={() =>
                              setActiveMenuId(activeMenuId === emp._id ? null : emp._id)
                            }
                            aria-label="Actions"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {activeMenuId === emp._id && (
                            <div className="action-popover animate-pop">
                              <Link
                                to={`/employees/${emp._id}`}
                                className="action-popover-item"
                                onClick={() => setActiveMenuId(null)}
                              >
                                <Eye size={14} />
                                <span>View</span>
                              </Link>

                              <Link
                                to={`/employees/${emp._id}/edit`}
                                className="action-popover-item"
                                onClick={() => setActiveMenuId(null)}
                              >
                                <Edit2 size={14} />
                                <span>Edit</span>
                              </Link>

                              <button
                                type="button"
                                className="action-popover-item text-danger"
                                onClick={() => openDeleteModal(emp)}
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

        {!loading && pagination.total > 0 && (
          <Pagination
            total={pagination.total}
            page={pagination.page}
            limit={pagination.limit}
            onPageChange={handlePageChange}
            itemLabel="employees"
          />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Employee"
        message={`Are you sure you want to remove employee "${empToDelete?.fullName} (${empToDelete?.employeeId})"? Business rules forbid deleting employees with active tasks.`}
        confirmText="Delete Employee"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setEmpToDelete(null);
        }}
      />
    </div>
  );
};
