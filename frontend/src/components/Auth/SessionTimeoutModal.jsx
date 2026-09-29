import React from 'react';
import { Clock, AlertTriangle, ShieldCheck, LogOut, RefreshCw } from 'lucide-react';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';
import './Auth.css';

/**
 * Session Timeout Warning Modal with countdown timer
 */
export function SessionTimeoutModal({
  isOpen,
  remainingSeconds,
  onExtendSession,
  onLogout,
  t,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      title={t.sessionWarningTitle || 'Session Inactivity Warning'}
      maxWidth="440px"
    >
      <div className="session-timeout-content">
        <div className="session-timeout-icon-box">
          <Clock size={36} className="session-clock-pulse" />
        </div>

        <p className="session-timeout-text">
          {t.sessionWarningDesc || 'Your active session is about to expire due to inactivity.'}
        </p>

        <div className="session-countdown-pill glass-card">
          <span>{t.sessionExpiresIn || 'Session Timeout in:'}</span>
          <strong className="session-countdown-digits">{remainingSeconds}s</strong>
        </div>

        <div className="session-timeout-actions">
          <Button variant="outline" size="md" onClick={onLogout} icon={LogOut}>
            {t.logoutButton || 'Sign Out'}
          </Button>

          <Button variant="primary" size="md" onClick={onExtendSession} icon={RefreshCw}>
            {t.extendSession || 'Extend Session'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
