import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Tag, ThumbsUp, Sparkles, ArrowRight, BookOpen } from 'lucide-react';
import { MarkdownRenderer } from '../Chat/MarkdownRenderer';
import { Badge } from '../UI/Badge';
import { Button } from '../UI/Button';
import './KnowledgeBase.css';

/**
 * Expandable Knowledge Base FAQ Article Card
 */
export function KnowledgeBaseCard({ article, onAskAi, t }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [helpfulCount, setHelpfulCount] = useState(article.helpfulCount || 0);
  const [hasVoted, setHasVoted] = useState(false);

  const handleVote = (e) => {
    e.stopPropagation();
    if (!hasVoted) {
      setHelpfulCount((prev) => prev + 1);
      setHasVoted(true);
    }
  };

  return (
    <div className={`kb-card glass-card ${isExpanded ? 'kb-card--expanded' : ''}`}>
      <div
        className="kb-card-header"
        onClick={() => setIsExpanded((prev) => !prev)}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
      >
        <div className="kb-card-title-group">
          <div className="kb-icon-box">
            <BookOpen size={16} />
          </div>
          <div className="kb-title-meta">
            <h3 className="kb-article-title">{article.title}</h3>
            <p className="kb-article-summary">{article.summary}</p>
          </div>
        </div>

        <div className="kb-card-actions">
          <div className="kb-helpful-pill" onClick={handleVote} title="Mark helpful">
            <ThumbsUp size={12} className={hasVoted ? 'text-cyan' : ''} />
            <span>{helpfulCount}</span>
          </div>

          <button
            type="button"
            className="kb-expand-chevron-btn"
            aria-label={isExpanded ? 'Collapse article' : 'Expand article'}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Tags row */}
      <div className="kb-tags-row">
        {article.tags.map((tag) => (
          <span key={tag} className="kb-tag-pill">
            #{tag}
          </span>
        ))}
      </div>

      {/* Expanded Article Body */}
      {isExpanded && (
        <div className="kb-article-body animate-fade-in">
          <div className="kb-content-divider" />
          <MarkdownRenderer content={article.content} />

          {/* Ask AI Fallback Footer inside card */}
          <div className="kb-card-footer glass-panel">
            <div className="kb-ai-prompt-preview">
              <Sparkles size={14} className="text-cyan" />
              <span>Have a specific scenario or need help applying this?</span>
            </div>
            <Button
              variant="accent"
              size="sm"
              icon={ArrowRight}
              iconPosition="right"
              onClick={() => onAskAi(article.suggestedPrompt || article.title)}
            >
              {t.askAiFallback || 'Consult AI Assistant'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
