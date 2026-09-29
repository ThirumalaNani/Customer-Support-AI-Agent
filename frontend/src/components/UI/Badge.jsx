import React from 'react';
import './Badge.css';

export function Badge({ variant = 'neutral', size = 'sm', children, className = '', icon: Icon = null }) {
  return (
    <span className={`ds-badge ds-badge--${variant} ds-badge--${size} ${className}`}>
      {Icon && <Icon className="ds-badge-icon" size={12} strokeWidth={2.2} />}
      <span className="ds-badge-text">{children}</span>
    </span>
  );
}
