import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { apiClient } from '../../api/apiClient';
import { useToast } from '../../context/ToastContext';

const VALID_NEXT_STATUSES = {
  Todo: ['In Progress', 'Cancelled'],
  'In Progress': ['Completed', 'Cancelled'],
  Completed: [],
  Cancelled: [],
};

export const StatusDropdown = ({ taskId, currentStatus, onStatusChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const { success, error } = useToast();

  const nextOptions = VALID_NEXT_STATUSES[currentStatus] || [];
  const isTerminal = nextOptions.length === 0;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectStatus = async (newStatus) => {
    if (newStatus === currentStatus) {
      setIsOpen(false);
      return;
    }

    setLoading(true);
    setIsOpen(false);

    try {
      const response = await apiClient.put(`/tasks/${taskId}/status`, { status: newStatus });
      success(`Task status updated to "${newStatus}"`);
      if (onStatusChange) {
        onStatusChange(response.data);
      }
    } catch (err) {
      error(err.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusButtonClass = (status) => {
    switch (status) {
      case 'In Progress':
        return 'status-btn-in-progress';
      case 'Completed':
        return 'status-btn-completed';
      case 'Cancelled':
        return 'status-btn-cancelled';
      case 'Todo':
      default:
        return 'status-btn-todo';
    }
  };

  return (
    <div className="status-dropdown-wrapper" ref={dropdownRef}>
      <button
        type="button"
        className={`status-trigger-btn ${getStatusButtonClass(currentStatus)} ${
          isTerminal ? 'cursor-default' : ''
        }`}
        onClick={() => !isTerminal && !loading && setIsOpen(!isOpen)}
        disabled={isTerminal || loading}
        title={isTerminal ? `${currentStatus} is final and cannot be changed` : 'Click to change status'}
      >
        {loading ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <span>{currentStatus}</span>
        )}
        {!isTerminal && <ChevronDown size={14} className={`chevron-icon ${isOpen ? 'rotate' : ''}`} />}
      </button>

      {isOpen && nextOptions.length > 0 && (
        <div className="status-menu animate-pop">
          <div className="status-menu-header">Valid Next Statuses:</div>
          {nextOptions.map((opt) => (
            <button
              key={opt}
              type="button"
              className={`status-menu-item item-${opt.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => handleSelectStatus(opt)}
            >
              <span className="dot-indicator"></span>
              <span>{opt}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
