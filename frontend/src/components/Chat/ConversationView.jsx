import React, { useRef, useEffect } from 'react';
import {
  MessageSquare,
  RotateCcw,
  Bot,
  Sparkles,
  ShieldCheck,
  Calendar,
  Clock,
  User,
  Globe,
  Plus,
  Database,
} from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { MemorySummaryCard } from './MemorySummaryCard';
import { Button } from '../UI/Button';
import { Badge } from '../UI/Badge';
import { useVoice } from '../../hooks/useVoice';
import './Chat.css';

export function ConversationView({
  messages,
  activeCustomer,
  activeCustomerId,
  suggestedPrompts,
  isSending,
  onSendMessage,
  onClearChat,
  onRegenerate,
  onRetry,
  onSubmitFeedback,
  onCreateNewChat,
  recalledHistory = [],
  retentionState,
  showRecalledContext,
  onToggleRecalledContext,
  language,
  systemStatus,
  t,
}) {
  const messagesEndRef = useRef(null);

  // Speech synthesis for message audio readout
  const { speakText, isSpeaking, speakingMessageId } = useVoice({
    language: activeCustomer?.preferredLanguage || language || 'en',
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const isReturning = activeCustomer?.type === 'Returning Customer';
  const lastAgentMsgIndex = messages.reduce(
    (lastIdx, msg, idx) => (msg.sender === 'agent' ? idx : lastIdx),
    -1
  );

  const lastAgentMessage = lastAgentMsgIndex >= 0 ? messages[lastAgentMsgIndex] : null;

  // Extract topic tags from active customer issues or recalled history
  const customerTags = (activeCustomer?.previousIssues || []).map((i) => i.category.toLowerCase().replace(/\s+/g, '-'));

  return (
    <section className="conversation-panel glass-panel" aria-label="Customer Conversation Workspace">
      {/* Customer Session Banner */}
      <div className="conversation-header">
        <div className="conv-header-left">
          <div className="conv-header-icon">
            <MessageSquare size={18} />
          </div>
          <div>
            <div className="conv-title-row">
              <h2 className="conv-title">{activeCustomer?.name || activeCustomerId}</h2>
              <Badge variant={isReturning ? 'accent' : 'neutral'} size="xs">
                {isReturning ? t.returningCustomer : t.newCustomer}
              </Badge>
              {activeCustomer?.tier && (
                <Badge variant="primary" size="xs">
                  {activeCustomer.tier}
                </Badge>
              )}
            </div>
            <div className="conv-meta-pills">
              <span className="conv-sub">
                {activeCustomer?.role || 'Customer'} {activeCustomer?.company ? `• ${activeCustomer.company}` : ''}
              </span>
              <span className="conv-id-badge">ID: {activeCustomerId}</span>
              {activeCustomer?.lastInteractionDate && (
                <span className="conv-last-seen">
                  <Clock size={11} /> {t.lastInteraction}: {activeCustomer.lastInteractionDate}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="conv-header-actions">
          {onToggleRecalledContext && (
            <Button
              variant={showRecalledContext ? 'secondary' : 'outline'}
              size="sm"
              onClick={onToggleRecalledContext}
              icon={Database}
              title={showRecalledContext ? 'Hide Recalled Context' : 'View Recalled Context on demand'}
            >
              Context ({recalledHistory.length})
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onCreateNewChat}
            icon={Plus}
            title={t.newChat}
          >
            {t.newChat}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClearChat}
            icon={RotateCcw}
            title={t.clearChat}
          >
            {t.clearChat}
          </Button>
        </div>
      </div>

      {/* Live LLM readiness signal */}
      {systemStatus?.status === 'degraded' && (
        <div className="assistant-health-strip" role="status">
          <div className="assistant-health-dot" aria-hidden="true" />
          <div className="assistant-health-copy">
            <strong>Assistant needs attention</strong>
            <span>
              {(systemStatus.llm_provider || 'AI provider').toUpperCase()} is not ready.
            </span>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="conversation-body">
        {messages.length === 0 ? (
          <div className="conversation-empty-state animate-fade-in">
            <div className="empty-state-card glass-card">
              <div className="empty-state-icon">
                <ShieldCheck size={28} strokeWidth={2.2} />
              </div>
              <h3 className="empty-state-title">{t.welcomeTitle}</h3>
              <p className="empty-state-desc">
                {isReturning ? (
                  <>
                    {t.welcomeDescReturning} (<strong>{activeCustomer?.name}</strong>)
                  </>
                ) : (
                  <>
                    {t.welcomeDescNew} (<strong>{activeCustomer?.name || activeCustomerId}</strong>)
                  </>
                )}
              </p>

              {activeCustomer?.summary && (
                <div className="empty-state-summary-box">
                  <strong>Memory Snapshot:</strong> {activeCustomer.summary}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((msg, index) => (
              <MessageBubble
                key={msg.id || index}
                message={msg}
                isLatestAgentMessage={index === lastAgentMsgIndex}
                onRegenerate={onRegenerate}
                onRetry={onRetry}
                onSubmitFeedback={onSubmitFeedback}
                onSpeak={speakText}
                isSpeaking={isSpeaking}
                isSpeakingThis={speakingMessageId === msg.id}
                onToggleRecalledContext={onToggleRecalledContext}
                t={t}
              />
            ))}

            {/* Memory Summary Card displayed after conversation turn */}
            {lastAgentMessage && (
              <MemorySummaryCard
                recalledMemories={lastAgentMessage.recalledMemories || recalledHistory}
                lastRetained={lastAgentMessage.historyRetained !== false}
                customerName={activeCustomer?.name}
                customerId={activeCustomerId}
                tags={customerTags}
                t={t}
              />
            )}
          </div>
        )}

        {/* Live Generating / Typing Wave Indicator */}
        {isSending && (
          <div className="typing-indicator-row animate-fade-in">
            <div className="typing-avatar">
              <Bot size={15} />
            </div>
            <div className="typing-bubble glass-card">
              <div className="typing-dots">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
              <span className="typing-text">{t.typingIndicator}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Container */}
      <ChatInput
        onSendMessage={onSendMessage}
        isSending={isSending}
        customerName={activeCustomer?.name}
        preferredLanguage={activeCustomer?.preferredLanguage}
        suggestedPrompts={suggestedPrompts}
        language={language}
        t={t}
      />
    </section>
  );
}
