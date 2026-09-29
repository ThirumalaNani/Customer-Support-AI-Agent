import React from 'react';
import { Database, ShieldCheck, Inbox, CheckCircle2, AlertTriangle, Layers, Loader2, X } from 'lucide-react';
import { MemoryCard } from './MemoryCard';
import { Badge } from '../UI/Badge';
import './RecallContext.css';

export function RecallContextPanel({
  recalledHistory = [],
  activeCustomer,
  activeCustomerId,
  isLoadingHistory,
  retentionState,
  onClose,
  t,
}) {
  const memoryCount = recalledHistory.length;
  const isReturning = activeCustomer?.type === 'Returning Customer';

  return (
    <aside className="recall-context-panel glass-panel" aria-label="Recalled Context Inspector">
      {/* Panel Header */}
      <div className="recall-header">
        <div className="recall-title-group">
          <div className="recall-icon-box">
            <Database size={18} strokeWidth={2.2} />
          </div>
          <div>
            <div className="recall-heading-row">
              <h2 className="recall-title">Recalled Context</h2>
              <Badge variant={memoryCount > 0 ? 'accent' : 'neutral'} size="xs">
                {memoryCount} {memoryCount === 1 ? 'record' : 'records'}
              </Badge>
            </div>
            <span className="recall-subtitle">Memory partition: {activeCustomerId}</span>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            className="recall-close-btn"
            onClick={onClose}
            title="Close Context Panel"
            aria-label="Close Context Panel"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="recall-body">
        {/* Explainer Note */}
        <div className="recall-explainer-banner glass-card">
          <p>
            Historical records recalled via memory query before constructing the LLM prompt. Informs persona continuity and prevents repetitive customer explanations.
          </p>
        </div>

        {/* Memory Items or Explicit Empty State */}
        {isLoadingHistory ? (
          <div className="recall-loading-state">
            <Loader2 className="recall-spinner animate-spin" size={24} />
            <span>Querying memory provider...</span>
          </div>
        ) : memoryCount > 0 ? (
          <div className="recall-records-list">
            {recalledHistory.map((record, index) => (
              <MemoryCard key={index} recordText={record} index={index} />
            ))}
          </div>
        ) : (
          <div className="recall-empty-state glass-card">
            <div className="empty-icon-wrapper">
              <Inbox size={26} strokeWidth={1.8} />
            </div>
            <h3 className="empty-state-headline">No Prior History on Record</h3>
            <p className="empty-state-copy">
              No historical interactions exist for account <strong>{activeCustomerId}</strong>.
              The agent will deliver standard baseline support, and this turn's resolution will be retained to initialize this customer's history.
            </p>
          </div>
        )}

        {/* Retention Status Card */}
        <div className={`retention-card glass-card ${retentionState?.lastRetained === false ? 'retention-card--warning' : ''}`}>
          <div className="retention-icon-wrapper">
            {retentionState?.lastRetained === false ? (
              <AlertTriangle size={17} className="retention-warning-icon" />
            ) : (
              <CheckCircle2 size={17} className="retention-success-icon" />
            )}
          </div>
          <div className="retention-info">
            <div className="retention-title-row">
              <strong className="retention-title">Memory Retention Layer</strong>
              <Badge variant={retentionState?.lastRetained === false ? 'warning' : 'success'} size="xs">
                {retentionState?.lastRetained === false ? 'Degraded' : 'Active'}
              </Badge>
            </div>
            <span className="retention-detail-text">
              {retentionState?.statusText || 'Ready to persist ongoing interactions'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
