import React, { useState } from 'react';
import { Shield, User, Lock, Key, ArrowRight, CheckCircle2, AlertCircle, Building, Globe } from 'lucide-react';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';
import { Badge } from '../UI/Badge';
import { LANGUAGE_OPTIONS } from '../../i18n/translations';
import './Auth.css';

/**
 * Authentication Modal for Customer ID Based Login & Role Selection
 */
export function AuthModal({
  isOpen,
  onClose,
  onLogin,
  customers = [],
  activeCustomerId,
  language,
  t,
}) {
  const [customerId, setCustomerId] = useState(activeCustomerId || 'alex_chen');
  const [passcode, setPasscode] = useState('demo123');
  const [role, setRole] = useState('customer'); // 'customer' | 'admin'
  const [selectedLang, setSelectedLang] = useState(language || 'en');
  const [error, setError] = useState(null);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!customerId.trim()) {
      setError(t.authError || 'Please enter a valid customer identifier.');
      return;
    }
    setError(null);
    onLogin({
      customerId: customerId.trim().toLowerCase(),
      role,
      language: selectedLang,
    });
    onClose();
  };

  const handleSelectPreset = (cust) => {
    setCustomerId(cust.id);
    if (cust.preferredLanguage) {
      setSelectedLang(cust.preferredLanguage);
    }
    setError(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t.loginTitle || 'Customer ID Login'}
      maxWidth="520px"
    >
      <form onSubmit={handleSubmit} className="auth-modal-form">
        <p className="auth-modal-subtitle">
          {t.loginSubtitle || 'Authenticate into your enterprise support partition & context store.'}
        </p>

        {error && (
          <div className="auth-error-banner animate-fade-in">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Role Selector */}
        <div className="auth-form-group">
          <label className="auth-form-label">{t.roleLabel || 'Access Role'}:</label>
          <div className="auth-role-tabs">
            <button
              type="button"
              className={`auth-role-tab ${role === 'customer' ? 'auth-role-tab--active' : ''}`}
              onClick={() => setRole('customer')}
            >
              <User size={14} />
              <span>{t.roleCustomer || 'Customer Lead'}</span>
            </button>
            <button
              type="button"
              className={`auth-role-tab ${role === 'admin' ? 'auth-role-tab--active' : ''}`}
              onClick={() => setRole('admin')}
            >
              <Shield size={14} />
              <span>{t.roleAdmin || 'Support Admin'}</span>
            </button>
          </div>
        </div>

        {/* Customer ID Input */}
        <div className="auth-form-group">
          <label htmlFor="auth-cid-input" className="auth-form-label">
            {t.customerIdLabel || 'Customer Account ID'}:
          </label>
          <div className="auth-input-wrapper">
            <User size={15} className="auth-input-icon" />
            <input
              id="auth-cid-input"
              type="text"
              className="auth-text-input"
              placeholder="e.g. alex_chen, priya_patel, or custom_id"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Passcode / PIN Input */}
        <div className="auth-form-group">
          <label htmlFor="auth-pass-input" className="auth-form-label">
            {t.passwordLabel || 'Passcode / PIN'}:
          </label>
          <div className="auth-input-wrapper">
            <Lock size={15} className="auth-input-icon" />
            <input
              id="auth-pass-input"
              type="password"
              className="auth-text-input"
              placeholder="••••••••"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
            />
          </div>
        </div>

        {/* Preferred Language for Session */}
        <div className="auth-form-group">
          <label htmlFor="auth-lang-select" className="auth-form-label">
            <Globe size={13} style={{ display: 'inline', marginRight: 4 }} />
            {t.preferredLangBadge || 'Preferred Language'}:
          </label>
          <select
            id="auth-lang-select"
            className="auth-select-input"
            value={selectedLang}
            onChange={(e) => setSelectedLang(e.target.value)}
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.flag} {opt.nativeName} ({opt.label})
              </option>
            ))}
          </select>
        </div>

        {/* Quick Select Presets */}
        <div className="auth-presets-section">
          <span className="auth-presets-label">
            {t.quickSelectPreset || 'Or Quick Select Customer Account:'}
          </span>
          <div className="auth-presets-grid">
            {customers.slice(0, 4).map((c) => {
              const isSelected = c.id === customerId;
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`auth-preset-chip ${isSelected ? 'auth-preset-chip--selected' : ''}`}
                  onClick={() => handleSelectPreset(c)}
                >
                  <div className="preset-chip-top">
                    <strong>{c.name}</strong>
                    {isSelected && <CheckCircle2 size={12} color="#38bdf8" />}
                  </div>
                  <span className="preset-chip-sub">
                    {c.company || c.role} • <code>{c.id}</code>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="auth-modal-actions">
          <Button
            type="submit"
            variant="primary"
            size="md"
            icon={ArrowRight}
            iconPosition="right"
            className="auth-submit-btn"
          >
            {t.loginButton || 'Sign In & Load Partition'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
