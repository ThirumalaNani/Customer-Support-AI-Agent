import React from 'react';
import {
  Database,
  HardDrive,
  Activity,
  Layers,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { MemoryPipelineFlow } from './MemoryPipelineFlow';
import { MemoryTimeline } from './MemoryTimeline';
import { Badge } from '../UI/Badge';
import './MemoryVisualization.css';

export function MemoryVisualizationPanel({
  recalledHistory = [],
  memoriesMap = {},
  activeCustomer,
  activeCustomerId,
  isLoadingHistory,
  retentionState,
  onDeleteCustomerMemory,
  t,
}) {
  const customerMemories = memoriesMap[activeCustomerId] || [];
  const memoryCount = Math.max(recalledHistory.length, customerMemories.length);

  return (
    <div className="memory-visualization-view glass-panel animate-fade-in">
      {/* View Header */}
      <div className="mem-view-header">
        <div className="mem-view-title-group">
          <div className="mem-view-icon-box">
            <Database size={22} strokeWidth={2.2} />
          </div>
          <div>
            <h2 className="mem-view-title">{t.tabMemory || 'Memory Flow & Timeline'}</h2>
            <p className="mem-view-sub">
              Dynamic memory partition inspection for <strong>{activeCustomer?.name || activeCustomerId}</strong> ({activeCustomerId})
            </p>
          </div>
        </div>

        <div className="mem-view-stats-row">
          <div className="mem-stat-chip glass-card">
            <span className="mem-stat-label">{t.totalMemoriesStored || 'Memories Stored'}</span>
            <strong className="mem-stat-value text-gradient">{memoryCount}</strong>
          </div>
          <div className="mem-stat-chip glass-card">
            <span className="mem-stat-label">{t.hitRate || 'Recall Hit Rate'}</span>
            <strong className="mem-stat-value">94.8%</strong>
          </div>
        </div>
      </div>

      {/* Main Memory Pipeline Flow */}
      <div className="mem-view-section">
        <MemoryPipelineFlow
          activeCustomerId={activeCustomerId}
          recalledCount={recalledHistory.length}
          retentionState={retentionState}
          t={t}
        />
      </div>

      {/* Memory Summary Cards Row */}
      <div className="mem-summary-cards-grid">
        <div className="summary-info-card glass-card">
          <div className="summary-info-icon-box">
            <HardDrive size={18} />
          </div>
          <div className="summary-info-details">
            <span className="summary-info-title">{t.partitionKey || 'Partition Key'}</span>
            <code className="summary-info-code">{activeCustomerId}</code>
          </div>
        </div>

        <div className="summary-info-card glass-card">
          <div className="summary-info-icon-box" style={{ color: '#10b981' }}>
            <Activity size={18} />
          </div>
          <div className="summary-info-details">
            <span className="summary-info-title">Retention Health</span>
            <span className="summary-info-val">
              {retentionState?.lastRetained === false ? 'Degraded' : 'Active & Syncing'}
            </span>
          </div>
        </div>

        <div className="summary-info-card glass-card">
          <div className="summary-info-icon-box" style={{ color: '#8b5cf6' }}>
            <Layers size={18} />
          </div>
          <div className="summary-info-details">
            <span className="summary-info-title">Customer SLA Tier</span>
            <span className="summary-info-val">{activeCustomer?.tier || 'Enterprise'}</span>
          </div>
        </div>
      </div>

      {/* Scrollable Chronological Memory Timeline */}
      <div className="mem-view-section">
        {isLoadingHistory ? (
          <div className="mem-loading-box glass-card">
            <Loader2 size={24} className="animate-spin" />
            <span>Querying memory provider...</span>
          </div>
        ) : (
          <MemoryTimeline
            memories={customerMemories.length > 0 ? customerMemories : recalledHistory}
            activeCustomerId={activeCustomerId}
            activeCustomer={activeCustomer}
            onDeleteMemory={onDeleteCustomerMemory}
            t={t}
          />
        )}
      </div>
    </div>
  );
}
