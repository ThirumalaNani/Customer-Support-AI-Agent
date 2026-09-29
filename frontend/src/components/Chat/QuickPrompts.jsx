import React from 'react';
import { Sparkles } from 'lucide-react';

export function QuickPrompts({ prompts, onSelectPrompt, disabled }) {
  if (!prompts || prompts.length === 0) return null;

  return (
    <div className="quick-prompts-container" aria-label="Suggested Customer Prompts">
      <div className="quick-prompts-label">
        <Sparkles size={13} className="quick-prompts-icon" />
        <span>Suggested Prompts:</span>
      </div>
      <div className="quick-prompts-list">
        {prompts.map((promptText, idx) => (
          <button
            key={idx}
            type="button"
            disabled={disabled}
            onClick={() => onSelectPrompt(promptText)}
            className="quick-prompt-pill"
          >
            {promptText}
          </button>
        ))}
      </div>
    </div>
  );
}
