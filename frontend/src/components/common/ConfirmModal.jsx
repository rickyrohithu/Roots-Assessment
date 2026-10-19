import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export const ConfirmModal = ({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isDanger = true,
  loading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onCancel}>
      <div
        className="modal-container animate-scale-up"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <div className="modal-title-wrapper">
            {isDanger && (
              <div className="modal-danger-icon">
                <AlertTriangle size={20} />
              </div>
            )}
            <h3 className="modal-title">{title}</h3>
          </div>
          <button className="modal-close-btn" onClick={onCancel} disabled={loading}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-message">{message}</p>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn ${isDanger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
