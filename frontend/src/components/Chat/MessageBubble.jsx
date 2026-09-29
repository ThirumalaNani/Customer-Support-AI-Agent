import React, { useState } from 'react';
import {
  Bot,
  User,
  AlertCircle,
  Database,
  Copy,
  Check,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Volume2,
  VolumeX,
  Paperclip,
  FileText,
} from 'lucide-react';
import { Badge } from '../UI/Badge';
import { FeedbackWidget } from '../Feedback/FeedbackWidget';
import { MarkdownRenderer } from './MarkdownRenderer';

export function MessageBubble({
  message,
  isLatestAgentMessage,
  onRegenerate,
  onRetry,
  onSubmitFeedback,
  onSpeak,
  isSpeaking,
  isSpeakingThis,
  onToggleRecalledContext,
  t,
}) {
  const [copied, setCopied] = useState(false);
  const [isMemoriesExpanded, setIsMemoriesExpanded] = useState(false);

  const isUser = message.sender === 'user';
  const isError = message.sender === 'system_error';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isError) {
    return (
      <div className="message-wrapper message-wrapper--error animate-fade-in" role="alert">
        <div className="message-bubble message-bubble--error">
          <div className="error-bubble-header">
            <AlertCircle size={15} />
            <strong>Assistant unavailable</strong>
          </div>
          <p className="message-text">{message.text}</p>
          {message.errorCode === 'not_configured' && (
            <p className="error-bubble-hint">
              Add the provider API key to <code>.env</code>, restart the backend, then retry.
            </p>
          )}
          {message.errorCode === 'model_unavailable' && (
            <p className="error-bubble-hint">
              Check <code>LLM_MODEL</code> against the provider's current model list, then restart the backend.
            </p>
          )}
          <div className="error-bubble-actions">
            {message.retryable !== false && onRetry && (
              <button
                type="button"
                className="error-retry-btn"
                onClick={onRetry}
              >
                <RotateCcw size={13} />
                Try again
              </button>
            )}
            <span className="message-timestamp">{message.timestamp}</span>
          </div>
        </div>
      </div>
    );
  }

  const recalledList = message.recalledMemories || [];
  const attachments = message.attachments || [];

  return (
    <div
      className={`message-wrapper ${isUser ? 'message-wrapper--user' : 'message-wrapper--agent'} animate-fade-in`}
    >
      <div className="message-avatar" aria-hidden="true">
        {isUser ? (
          <User size={16} strokeWidth={2.2} />
        ) : (
          <Bot size={16} strokeWidth={2.2} />
        )}
      </div>

      <div className="message-body">
        <div className="message-meta-row">
          <span className="message-author">{isUser ? 'Customer' : 'Assistant'}</span>
          <span className="message-timestamp">{message.timestamp}</span>

          {!isUser && recalledList.length > 0 && (
            <button
              type="button"
              className="message-recalled-tag"
              onClick={() => {
                setIsMemoriesExpanded((prev) => !prev);
                if (onToggleRecalledContext) onToggleRecalledContext();
              }}
              title={t.viewRecalledDetails || 'View recalled memories'}
            >
              <Database size={11} />
              <span>
                {recalledList.length}{' '}
                {recalledList.length === 1
                  ? t.recalledMemory || 'memory recalled'
                  : t.recalledMemories || 'memories recalled'}
              </span>
              {isMemoriesExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
          )}
        </div>

        {/* Expandable Recalled Memories Drawer */}
        {!isUser && isMemoriesExpanded && recalledList.length > 0 && (
          <div className="message-recalled-drawer glass-card animate-fade-in">
            <div className="drawer-header">
              <Sparkles size={13} className="drawer-icon text-cyan" />
              <span>Retrieved Customer Memories Before Response:</span>
            </div>
            <ul className="drawer-memories-list">
              {recalledList.map((mem, idx) => (
                <li key={idx} className="drawer-memory-item">
                  <span className="drawer-mem-bullet">•</span>
                  <span>{mem}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Message Content Bubble with Markdown Rendering */}
        <div className={`message-bubble ${isUser ? 'message-bubble--user' : 'message-bubble--agent'}`}>
          {/* Attached Files in Message */}
          {attachments.length > 0 && (
            <div className="message-attachments-row">
              {attachments.map((file, fIdx) => (
                <div key={fIdx} className="message-attachment-chip">
                  {file.isImage && file.previewUrl ? (
                    <img src={file.previewUrl} alt={file.name} className="attachment-chip-img" />
                  ) : (
                    <FileText size={13} className="attachment-chip-icon" />
                  )}
                  <span className="attachment-chip-name">{file.name}</span>
                </div>
              ))}
            </div>
          )}

          <div className="message-content">
            {isUser ? (
              <p className="message-user-text">{message.text}</p>
            ) : (
              <MarkdownRenderer content={message.text} isStreaming={message.isStreaming} />
            )}
          </div>

          {/* Action Row on Message: Copy, Voice Read Aloud & Regenerate */}
          <div className="message-actions-bar">
            {/* Copy Button */}
            <button
              type="button"
              className="message-action-icon-btn"
              onClick={handleCopy}
              title={copied ? t.copied || 'Copied!' : t.copyText || 'Copy message'}
              aria-label="Copy message"
            >
              {copied ? <Check size={13} className="copy-success-icon" /> : <Copy size={13} />}
              <span className="action-btn-text">{copied ? t.copied || 'Copied!' : ''}</span>
            </button>

            {/* Audio Speech Read Aloud Button for Assistant Messages */}
            {!isUser && onSpeak && (
              <button
                type="button"
                className={`message-action-icon-btn ${isSpeakingThis ? 'message-action-icon-btn--active' : ''}`}
                onClick={() => onSpeak(message.text, message.id)}
                title={isSpeakingThis ? t.voiceOutputStop || 'Stop audio' : t.voiceOutputPlay || 'Read aloud'}
                aria-label="Read response aloud"
              >
                {isSpeakingThis ? (
                  <VolumeX size={13} className="text-cyan animate-pulse" />
                ) : (
                  <Volume2 size={13} />
                )}
                <span className="action-btn-text">
                  {isSpeakingThis ? 'Speaking...' : ''}
                </span>
              </button>
            )}

            {/* Regenerate Option on Latest Agent Message */}
            {!isUser && isLatestAgentMessage && (
              <button
                type="button"
                className="message-action-icon-btn"
                onClick={onRegenerate}
                title={t.regenerate || 'Regenerate response'}
                aria-label="Regenerate response"
              >
                <RotateCcw size={13} />
                <span className="action-btn-text">{t.regenerate || 'Regenerate'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Feedback Widget for Assistant Messages */}
        {!isUser && (
          <FeedbackWidget
            messageId={message.id}
            initialFeedback={message.feedback}
            onSubmitFeedback={onSubmitFeedback}
            t={t}
          />
        )}
      </div>
    </div>
  );
}
