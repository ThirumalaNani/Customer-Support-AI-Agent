import React, { useState, useRef, useEffect } from 'react';
import { Send, Globe, Mic, MicOff, Paperclip, Sparkles } from 'lucide-react';
import { Button } from '../UI/Button';
import { QuickPrompts } from './QuickPrompts';
import { FileUpload } from './FileUpload';
import { FilePreviewList } from './FilePreview';
import { VoiceWaveform } from '../Voice/VoiceWaveform';
import { useVoice } from '../../hooks/useVoice';

export function ChatInput({
  onSendMessage,
  isSending,
  customerName,
  preferredLanguage,
  suggestedPrompts,
  language,
  t,
}) {
  const [inputVal, setInputVal] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const textareaRef = useRef(null);

  // Voice speech-to-text hook
  const { isListening, toggleListening, voiceSupported } = useVoice({
    language: preferredLanguage || language || 'en',
    onSpeechResult: (transcript, isFinal) => {
      setInputVal(transcript);
    },
  });

  const handleAddFile = (fileObj) => {
    setAttachedFiles((prev) => [...prev, fileObj]);
  };

  const handleRemoveFile = (fileId) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if ((!inputVal.trim() && attachedFiles.length === 0) || isSending) return;

    onSendMessage(inputVal.trim(), attachedFiles);
    setInputVal('');
    setAttachedFiles([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [inputVal]);

  const langLabel =
    preferredLanguage === 'te'
      ? 'Telugu (తెలుగు)'
      : preferredLanguage === 'hi'
      ? 'Hindi (हिंदी)'
      : 'English';

  return (
    <div className="chat-input-container">
      {/* Quick Prompts Bar */}
      {suggestedPrompts && suggestedPrompts.length > 0 && (
        <QuickPrompts
          prompts={suggestedPrompts}
          onSelectPrompt={(p) => onSendMessage(p, [])}
          disabled={isSending}
        />
      )}

      {/* Voice Waveform Activity Overlay */}
      <VoiceWaveform
        isListening={isListening}
        label={t.voiceListening || 'Listening... Speak in preferred language'}
      />

      {/* Input Form */}
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <div className="chat-input-box glass-card">
          {/* File Attachment Previews */}
          <FilePreviewList files={attachedFiles} onRemoveFile={handleRemoveFile} />

          <div className="chat-input-row">
            {/* Attachment Button */}
            <FileUpload
              onFilesSelected={handleAddFile}
              disabled={isSending}
              t={t}
            />

            {/* Voice Input Button */}
            {voiceSupported && (
              <button
                type="button"
                className={`chat-voice-btn ${isListening ? 'chat-voice-btn--active' : ''}`}
                onClick={toggleListening}
                disabled={isSending}
                title={isListening ? t.voiceInputStop || 'Stop recording' : t.voiceInputStart || 'Start voice input'}
                aria-label="Voice input"
              >
                {isListening ? (
                  <MicOff size={16} className="text-red animate-pulse" />
                ) : (
                  <Mic size={16} />
                )}
              </button>
            )}

            {/* Expanding Textarea */}
            <textarea
              ref={textareaRef}
              className="chat-textarea"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                t.inputPlaceholder
                  ? t.inputPlaceholder.replace('customer', customerName || 'customer')
                  : `Inquire on behalf of ${customerName || 'customer'}...`
              }
              rows={1}
              disabled={isSending}
            />

            {/* Send Action Button */}
            <div className="chat-input-actions">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSending}
                disabled={(!inputVal.trim() && attachedFiles.length === 0) || isSending}
                icon={Send}
                iconPosition="right"
                className="chat-send-btn"
              >
                {t.send || 'Send'}
              </Button>
            </div>
          </div>
        </div>

        <div className="chat-input-footer">
          <div className="chat-lang-indicator">
            <Globe size={12} />
            <span>
              {t.preferredLangBadge || 'Customer Language'}: <strong>{langLabel}</strong>
            </span>
          </div>
          <span className="chat-input-hint">
            {t.inputHint || 'Press Enter to send, Shift + Enter for newline'}
          </span>
        </div>
      </form>
    </div>
  );
}
