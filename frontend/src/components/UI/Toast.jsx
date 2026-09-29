import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import './Toast.css';

export function Toast({ message, onClose }) {
  if (!message) return null;

  return (
    <div className="ds-toast" role="alert">
      <div className="ds-toast-icon">
        <AlertCircle size={18} strokeWidth={2.2} />
      </div>
      <div className="ds-toast-content">
        <p className="ds-toast-message">{message}</p>
      </div>
      <button className="ds-toast-close" onClick={onClose} aria-label="Dismiss message">
        <X size={16} />
      </button>
    </div>
  );
}
