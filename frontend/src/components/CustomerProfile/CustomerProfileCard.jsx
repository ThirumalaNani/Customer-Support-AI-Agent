import React, { useState } from 'react';
import {
  User,
  Building,
  Mail,
  Shield,
  Clock,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Globe,
  Tag,
  Calendar,
  Layers,
  Edit3,
} from 'lucide-react';
import { Badge } from '../UI/Badge';
import { Button } from '../UI/Button';
import { LANGUAGE_OPTIONS } from '../../i18n/translations';
import './CustomerProfile.css';

export function CustomerProfileCard({
  activeCustomer,
  activeCustomerId,
  onUpdatePreferredLanguage,
  t,
}) {
  const [isEditingLang, setIsEditingLang] = useState(false);

  if (!activeCustomer) {
    return (
      <div className="customer-profile-view glass-panel">
        <div className="customer-profile-empty">
          <User size={32} />
          <p>No customer account currently loaded.</p>
        </div>
      </div>
    );
  }

  const getInitials = (name) => {
    if (!name) return 'CU';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const isReturning = activeCustomer.type === 'Returning Customer';
  const issues = activeCustomer.previousIssues || [];
  const currentLangObj =
    LANGUAGE_OPTIONS.find((l) => l.code === activeCustomer.preferredLanguage) ||
    LANGUAGE_OPTIONS[0];

  return (
    <div className="customer-profile-view glass-panel animate-fade-in">
      {/* Top Customer Banner */}
      <div className="customer-banner glass-card">
        <div className="customer-banner-main">
          <div className="customer-banner-avatar">{getInitials(activeCustomer.name)}</div>
          <div className="customer-banner-text">
            <div className="customer-name-row">
              <h2 className="customer-name">{activeCustomer.name}</h2>
              <Badge variant={isReturning ? 'accent' : 'neutral'} size="sm">
                {isReturning ? t.returningCustomer : t.newCustomer}
              </Badge>
              {activeCustomer.tier && (
                <Badge variant="primary" size="sm">
                  {activeCustomer.tier}
                </Badge>
              )}
            </div>
            <p className="customer-role-sub">
              {activeCustomer.role} • {activeCustomer.company || 'Enterprise Customer'}
            </p>
          </div>
        </div>

        <div className="customer-banner-stats">
          <div className="banner-stat-box">
            <span className="banner-stat-label">{t.totalInteractions || 'Total Interactions'}</span>
            <span className="banner-stat-val text-gradient">
              {activeCustomer.totalInteractions || 1}
            </span>
          </div>
          <div className="banner-stat-box">
            <span className="banner-stat-label">{t.lastInteraction || 'Last Seen'}</span>
            <span className="banner-stat-val">
              {activeCustomer.lastInteractionDate || 'Today'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Profile Info & AI Summary */}
      <div className="customer-profile-grid">
        {/* Left Column: Account Details & Preferred Language */}
        <div className="profile-column">
          <div className="profile-card glass-card">
            <div className="profile-card-header">
              <User size={16} className="card-header-icon" />
              <h3 className="profile-card-title">{t.customerInfo || 'Customer Information'}</h3>
            </div>

            <div className="profile-details-list">
              <div className="detail-row">
                <span className="detail-label">{t.partitionKey || 'Customer Account ID'}:</span>
                <code className="detail-mono">{activeCustomerId}</code>
              </div>

              <div className="detail-row">
                <span className="detail-label">{t.contactRole || 'Title / Role'}:</span>
                <span className="detail-value">{activeCustomer.role}</span>
              </div>

              <div className="detail-row">
                <span className="detail-label">{t.company || 'Organization'}:</span>
                <span className="detail-value">{activeCustomer.company || 'Enterprise Account'}</span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Email Address:</span>
                <span className="detail-value">{activeCustomer.email || `${activeCustomerId}@example.com`}</span>
              </div>

              <div className="detail-row">
                <span className="detail-label">{t.tier || 'SLA Level'}:</span>
                <span className="detail-value">{activeCustomer.tier || 'Enterprise Tier (24/7 Priority)'}</span>
              </div>

              {/* Preferred Language Setting */}
              <div className="detail-row detail-row--language">
                <div className="lang-label-group">
                  <Globe size={14} className="lang-icon" />
                  <span className="detail-label">{t.preferredLanguageSetting || 'Preferred Language'}:</span>
                </div>

                <div className="lang-selector-group">
                  {isEditingLang ? (
                    <div className="lang-select-wrapper">
                      <select
                        className="lang-select-input"
                        value={activeCustomer.preferredLanguage || 'en'}
                        onChange={(e) => {
                          onUpdatePreferredLanguage(activeCustomerId, e.target.value);
                          setIsEditingLang(false);
                        }}
                      >
                        {LANGUAGE_OPTIONS.map((opt) => (
                          <option key={opt.code} value={opt.code}>
                            {opt.flag} {opt.nativeName} ({opt.label})
                          </option>
                        ))}
                      </select>
                      <Button variant="ghost" size="sm" onClick={() => setIsEditingLang(false)}>
                        Done
                      </Button>
                    </div>
                  ) : (
                    <div className="lang-display-pill">
                      <Badge variant="accent" size="sm">
                        {currentLangObj.flag} {currentLangObj.nativeName} ({currentLangObj.label})
                      </Badge>
                      <button
                        className="lang-edit-btn"
                        onClick={() => setIsEditingLang(true)}
                        title="Change preferred language"
                      >
                        <Edit3 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* AI Customer Summary Card */}
          <div className="profile-card glass-card">
            <div className="profile-card-header">
              <Sparkles size={16} className="card-header-icon ai-sparkle" />
              <h3 className="profile-card-title">{t.aiSummaryTitle || 'AI Customer Summary'}</h3>
            </div>
            <p className="ai-summary-text">
              {activeCustomer.aiCustomerSummary || activeCustomer.summary || 'Contextual memory partition active.'}
            </p>
          </div>
        </div>

        {/* Right Column: Previous Issues & History Log */}
        <div className="profile-column">
          <div className="profile-card glass-card">
            <div className="profile-card-header">
              <Layers size={16} className="card-header-icon" />
              <h3 className="profile-card-title">{t.previousIssuesTitle || 'Previous Issues & Topics'}</h3>
              <Badge variant="neutral" size="xs">
                {issues.length} {issues.length === 1 ? 'topic' : 'topics'}
              </Badge>
            </div>

            {issues.length === 0 ? (
              <div className="issues-empty-state">
                <p>No prior issues logged for this new inquiry session.</p>
              </div>
            ) : (
              <div className="issues-list">
                {issues.map((issue) => (
                  <div key={issue.id} className="issue-item-card glass-card">
                    <div className="issue-top-row">
                      <span className="issue-id-badge">{issue.id}</span>
                      <span className="issue-date">
                        <Calendar size={11} /> {issue.date}
                      </span>
                      <Badge
                        variant={
                          issue.status === 'Resolved'
                            ? 'success'
                            : issue.status === 'Monitoring'
                            ? 'warning'
                            : 'primary'
                        }
                        size="xs"
                      >
                        {issue.status}
                      </Badge>
                    </div>
                    <p className="issue-title-text">{issue.title}</p>
                    <span className="issue-category-tag">
                      <Tag size={10} /> {issue.category}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
