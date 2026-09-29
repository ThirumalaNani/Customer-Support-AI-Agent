import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import './Toast.css';

/**
 * Global Offline State Detector Banner
 */
export function OfflineBanner({ t }) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="offline-banner glass-card animate-fade-in" role="alert">
      <div className="offline-banner-content">
        <WifiOff size={16} className="offline-icon text-red" />
        <div className="offline-text-group">
          <strong>{t.offlineBannerTitle || 'You are currently offline'}</strong>
          <span>
            {t.offlineBannerDesc || 'Cached customer data is accessible. Reconnect to send live API inquiries.'}
          </span>
        </div>
      </div>
      <button
        type="button"
        className="offline-retry-btn"
        onClick={() => setIsOffline(!navigator.onLine)}
      >
        <RefreshCw size={13} />
        <span>Check Connection</span>
      </button>
    </div>
  );
}
