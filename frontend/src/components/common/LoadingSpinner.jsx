import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner = ({ text = 'Loading data...' }) => {
  return (
    <div className="loading-state">
      <Loader2 size={36} className="animate-spin text-primary" />
      <span className="loading-text">{text}</span>
    </div>
  );
};
