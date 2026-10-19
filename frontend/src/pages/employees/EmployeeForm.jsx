import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, AlertCircle, Plus, X } from 'lucide-react';
import { apiClient } from '../../api/apiClient';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';

const DEPARTMENTS = ['Development', 'Design', 'QA', 'HR', 'Sales'];
const STATUSES = ['Active', 'Inactive', 'On Leave'];

export const EmployeeForm = () => {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [backendError, setBackendError] = useState('');
  const [clientErrors, setClientErrors] = useState({});

  const [skillInput, setSkillInput] = useState('');

  const [formData, setFormData] = useState({
    employeeId: '',
    fullName: '',
    email: '',
    phone: '',
    department: 'Development',
    role: '',
    joiningDate: '',
    status: 'Active',
    skills: [],
    leaveStart: '',
    leaveEnd: '',
  });

  // Load employee data if editing
  useEffect(() => {
    if (isEditMode) {
      const fetchEmployee = async () => {
        try {
          const res = await apiClient.get(`/employees/${id}`);
          const emp = res.data;
          setFormData({
            employeeId: emp.employeeId || '',
            fullName: emp.fullName || '',
            email: emp.email || '',
            phone: emp.phone || '',
            department: emp.department || 'Development',
            role: emp.role || '',
            joiningDate: emp.joiningDate ? emp.joiningDate.split('T')[0] : '',
            status: emp.status || 'Active',
            skills: emp.skills || [],
            leaveStart: emp.leaveStart ? emp.leaveStart.split('T')[0] : '',
            leaveEnd: emp.leaveEnd ? emp.leaveEnd.split('T')[0] : '',
          });
        } catch (err) {
          toastError(err.message || 'Failed to load employee details');
          navigate('/employees');
        } finally {
          setLoading(false);
        }
      };
      fetchEmployee();
    }
  }, [id, isEditMode, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setBackendError('');
    if (clientErrors[name]) {
      setClientErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  // Add skill
  const handleAddSkill = (e) => {
    e.preventDefault();
    if (!skillInput.trim()) return;
    if (formData.skills.includes(skillInput.trim())) {
      setSkillInput('');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      skills: [...prev.skills, skillInput.trim()],
    }));
    setSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillToRemove),
    }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.employeeId.trim()) errors.employeeId = 'Employee ID is required';
    if (!formData.fullName.trim()) errors.fullName = 'Full Name is required';
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    if (!formData.phone.trim()) errors.phone = 'Phone number is required';
    if (!formData.department) errors.department = 'Department is required';
    if (!formData.role.trim()) errors.role = 'Role is required';
    if (!formData.joiningDate) errors.joiningDate = 'Joining Date is required';

    if (formData.status === 'On Leave') {
      if (!formData.leaveStart) errors.leaveStart = 'Leave start date is required';
      if (!formData.leaveEnd) errors.leaveEnd = 'Leave end date is required';
      if (formData.leaveStart && formData.leaveEnd) {
        if (new Date(formData.leaveEnd) < new Date(formData.leaveStart)) {
          errors.leaveEnd = 'Leave End date cannot be earlier than Leave Start date';
        }
      }
    }

    setClientErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBackendError('');

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        email: formData.email.trim().toLowerCase(),
        employeeId: formData.employeeId.trim().toUpperCase(),
      };

      if (payload.status !== 'On Leave') {
        payload.leaveStart = null;
        payload.leaveEnd = null;
      }

      if (isEditMode) {
        await apiClient.put(`/employees/${id}`, payload);
        success('Employee updated successfully');
      } else {
        await apiClient.post('/employees', payload);
        success('Employee created successfully');
      }
      navigate('/employees');
    } catch (err) {
      const msg = err.message || 'Failed to save employee';
      setBackendError(msg);
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading employee details..." />;
  }

  return (
    <div className="form-page-container container animate-fade-in">
      <div className="form-back-nav">
        <Link to="/employees" className="back-link">
          <ArrowLeft size={16} />
          <span>Back to Employees</span>
        </Link>
      </div>

      <div className="form-card">
        <div className="form-card-header">
          <h1 className="form-title">{isEditMode ? 'Edit Employee' : 'Add Employee'}</h1>
          <p className="form-subtitle">
            {isEditMode
              ? 'Update employee profile and status.'
              : 'Add a new employee to the team.'}
          </p>
        </div>

        {backendError && (
          <div className="form-error-wrapper">
            <ErrorBanner message={backendError} onClose={() => setBackendError('')} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="standard-form">
          <div className="form-grid">
            {/* Employee ID */}
            <div className="form-group">
              <label htmlFor="emp-id" className="form-label">
                Employee ID <span className="required-star">*</span>
              </label>
              <input
                id="emp-id"
                name="employeeId"
                type="text"
                placeholder="e.g. EMP-015"
                value={formData.employeeId}
                onChange={handleChange}
                disabled={submitting}
                className={`form-input font-mono uppercase ${
                  clientErrors.employeeId ? 'input-error' : ''
                }`}
              />
              {clientErrors.employeeId && (
                <span className="field-error-msg">{clientErrors.employeeId}</span>
              )}
            </div>

            {/* Full Name */}
            <div className="form-group">
              <label htmlFor="emp-name" className="form-label">
                Full Name <span className="required-star">*</span>
              </label>
              <input
                id="emp-name"
                name="fullName"
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={formData.fullName}
                onChange={handleChange}
                disabled={submitting}
                className={`form-input ${clientErrors.fullName ? 'input-error' : ''}`}
              />
              {clientErrors.fullName && (
                <span className="field-error-msg">{clientErrors.fullName}</span>
              )}
            </div>

            {/* Email */}
            <div className="form-group">
              <label htmlFor="emp-email" className="form-label">
                Email Address <span className="required-star">*</span>
              </label>
              <input
                id="emp-email"
                name="email"
                type="email"
                placeholder="e.g. rahul@rootsmedia.com"
                value={formData.email}
                onChange={handleChange}
                disabled={submitting}
                className={`form-input lowercase ${clientErrors.email ? 'input-error' : ''}`}
              />
              {clientErrors.email && (
                <span className="field-error-msg">{clientErrors.email}</span>
              )}
            </div>

            {/* Phone */}
            <div className="form-group">
              <label htmlFor="emp-phone" className="form-label">
                Phone Number <span className="required-star">*</span>
              </label>
              <input
                id="emp-phone"
                name="phone"
                type="text"
                placeholder="e.g. +91 98765 43210"
                value={formData.phone}
                onChange={handleChange}
                disabled={submitting}
                className={`form-input ${clientErrors.phone ? 'input-error' : ''}`}
              />
              {clientErrors.phone && (
                <span className="field-error-msg">{clientErrors.phone}</span>
              )}
            </div>

            {/* Department */}
            <div className="form-group">
              <label htmlFor="emp-dept" className="form-label">
                Department <span className="required-star">*</span>
              </label>
              <select
                id="emp-dept"
                name="department"
                value={formData.department}
                onChange={handleChange}
                disabled={submitting}
                className="form-select"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Role */}
            <div className="form-group">
              <label htmlFor="emp-role" className="form-label">
                Role / Designation <span className="required-star">*</span>
              </label>
              <input
                id="emp-role"
                name="role"
                type="text"
                placeholder="e.g. Senior Full Stack Engineer"
                value={formData.role}
                onChange={handleChange}
                disabled={submitting}
                className={`form-input ${clientErrors.role ? 'input-error' : ''}`}
              />
              {clientErrors.role && (
                <span className="field-error-msg">{clientErrors.role}</span>
              )}
            </div>

            {/* Joining Date */}
            <div className="form-group">
              <label htmlFor="emp-joining" className="form-label">
                Joining Date <span className="required-star">*</span>
              </label>
              <input
                id="emp-joining"
                name="joiningDate"
                type="date"
                value={formData.joiningDate}
                onChange={handleChange}
                disabled={submitting}
                className={`form-input ${clientErrors.joiningDate ? 'input-error' : ''}`}
              />
              {clientErrors.joiningDate && (
                <span className="field-error-msg">{clientErrors.joiningDate}</span>
              )}
            </div>

            {/* Status */}
            <div className="form-group">
              <label htmlFor="emp-status" className="form-label">
                Status <span className="required-star">*</span>
              </label>
              <select
                id="emp-status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                disabled={submitting}
                className="form-select"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Conditional Leave Dates when On Leave */}
          {formData.status === 'On Leave' && (
            <div className="leave-dates-box animate-fade-in mt-4">
              <div className="leave-box-title">
                <span>Leave Period Details (Required when On Leave)</span>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="emp-leave-start" className="form-label">
                    Leave Start Date <span className="required-star">*</span>
                  </label>
                  <input
                    id="emp-leave-start"
                    name="leaveStart"
                    type="date"
                    value={formData.leaveStart}
                    onChange={handleChange}
                    disabled={submitting}
                    className={`form-input ${clientErrors.leaveStart ? 'input-error' : ''}`}
                  />
                  {clientErrors.leaveStart && (
                    <span className="field-error-msg">{clientErrors.leaveStart}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="emp-leave-end" className="form-label">
                    Leave End Date <span className="required-star">*</span>
                  </label>
                  <input
                    id="emp-leave-end"
                    name="leaveEnd"
                    type="date"
                    value={formData.leaveEnd}
                    onChange={handleChange}
                    disabled={submitting}
                    className={`form-input ${clientErrors.leaveEnd ? 'input-error' : ''}`}
                  />
                  {clientErrors.leaveEnd && (
                    <span className="field-error-msg">{clientErrors.leaveEnd}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Skills Management */}
          <div className="form-group full-width mt-4">
            <label className="form-label">Skills & Competencies</label>
            <div className="skill-input-row">
              <input
                type="text"
                placeholder="Type skill and click Add (e.g. React, Node.js)"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill(e);
                  }
                }}
                className="form-input"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="btn btn-secondary btn-icon"
              >
                <Plus size={16} />
                <span>Add Skill</span>
              </button>
            </div>

            {formData.skills.length > 0 && (
              <div className="skills-badge-list mt-3">
                {formData.skills.map((skill) => (
                  <span key={skill} className="skill-chip">
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="chip-remove-btn"
                      aria-label={`Remove skill ${skill}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="form-submit-row">
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-submit-primary"
            >
              {submitting ? 'Saving...' : isEditMode ? 'Update Employee' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
