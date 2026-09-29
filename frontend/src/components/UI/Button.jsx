import React from 'react';
import { Loader2 } from 'lucide-react';
import './Button.css';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon: Icon = null,
  iconPosition = 'left',
  className = '',
  type = 'button',
  onClick,
  title,
  ...props
}) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      title={title}
      className={`ds-button ds-button--${variant} ds-button--${size} ${isLoading ? 'ds-button--loading' : ''} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="ds-button-spinner" size={size === 'sm' ? 14 : 16} />
      ) : (
        Icon && iconPosition === 'left' && <Icon className="ds-button-icon" size={size === 'sm' ? 14 : 16} />
      )}
      <span className="ds-button-label">{children}</span>
      {!isLoading && Icon && iconPosition === 'right' && (
        <Icon className="ds-button-icon" size={size === 'sm' ? 14 : 16} />
      )}
    </button>
  );
}
