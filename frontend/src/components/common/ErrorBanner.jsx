import React from 'react';
import { AlertCircle, X } from 'lucide-react';

export const ErrorBanner = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div className="error-banner animate-shake" role="alert">
      <div className="error-banner-content">
        <AlertCircle size={18} className="error-banner-icon" />
        <span className="error-banner-text">{message}</span>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="error-banner-close"
          aria-label="Dismiss error"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};
