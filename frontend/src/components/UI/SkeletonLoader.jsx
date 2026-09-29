import React from 'react';
import './SkeletonLoader.css';

/**
 * Skeleton Loader Component with Microsoft Fluent shimmer effect
 */
export function SkeletonLoader({ type = 'text', count = 1, width, height, className = '' }) {
  return (
    <div className={`skeleton-wrapper ${className}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`skeleton skeleton--${type}`}
          style={{
            width: width || (type === 'text' ? `${80 + (i % 3) * 10}%` : undefined),
            height: height || undefined,
          }}
        />
      ))}
    </div>
  );
}

export function MessageSkeleton() {
  return (
    <div className="skeleton-message-row animate-fade-in" aria-hidden="true">
      <div className="skeleton skeleton--avatar" />
      <div className="skeleton-message-content">
        <div className="skeleton skeleton--line" style={{ width: '35%', height: '12px' }} />
        <div className="skeleton skeleton--card" style={{ width: '80%', height: '56px' }} />
      </div>
    </div>
  );
}
