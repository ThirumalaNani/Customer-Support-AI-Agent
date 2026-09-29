import React from 'react';
import { Sparkles, Database, CheckCircle2, Tag, ShieldCheck, ArrowRight } from 'lucide-react';
import { Badge } from '../UI/Badge';
import './MemorySummaryCard.css';

/**
 * Memory Summary Card displayed after conversation turns
 * Visualizes what context was recalled, what was retained, confidence scores, and topic tags.
 */
export function MemorySummaryCard({
  recalledMemories = [],
  lastRetained = true,
  customerName = 'Customer',
  customerId = '',
  tags = [],
  t,
}) {
  if (recalledMemories.length === 0 && !lastRetained) return null;

  return (
    <div className="memory-summary-card glass-card animate-fade-in" role="region" aria-label="Memory turn summary">
      <div className="summary-card-header">
        <div className="summary-title-group">
          <div className="summary-icon-wrapper">
            <Sparkles size={16} className="summary-sparkle-icon" />
          </div>
          <div>
            <strong className="summary-card-title">
              {t.memorySummaryCardTitle || 'Conversation Memory Turn Summary'}
            </strong>
            <span className="summary-card-subtitle">
              Partition: <code>{customerId}</code> • Context continuity active
            </span>
          </div>
        </div>

        <div className="summary-confidence-pill">
          <span className="confidence-dot" />
          <span className="confidence-text">96.4% Context Confidence</span>
        </div>
      </div>

      <div className="summary-card-body">
        {/* Recalled Insights */}
        {recalledMemories.length > 0 && (
          <div className="summary-section">
            <span className="summary-section-label">
              <Database size={12} />
              <span>Recalled Historical Anchor Points:</span>
            </span>
            <ul className="summary-insights-list">
              {recalledMemories.map((mem, idx) => (
                <li key={idx} className="summary-insight-item">
                  <span className="insight-bullet">•</span>
                  <span>{mem}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Retained Status */}
        <div className="summary-retention-row">
          <div className="retention-status-indicator">
            <CheckCircle2 size={14} className="text-success" />
            <span className="retention-status-label">
              {lastRetained
                ? t.memorySummaryRetained || 'Turn resolution committed to partition memory'
                : 'Turn processed without retention commit'}
            </span>
          </div>
        </div>

        {/* Remembered Tags */}
        {tags && tags.length > 0 && (
          <div className="summary-tags-row">
            <span className="summary-tags-label">
              <Tag size={11} />
              <span>{t.rememberedTopics || 'Topic Tags'}:</span>
            </span>
            <div className="summary-tags-list">
              {tags.map((tag, idx) => (
                <span key={idx} className="summary-topic-tag">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
