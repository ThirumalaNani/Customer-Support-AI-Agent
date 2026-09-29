import React from 'react';
import { Command, CornerDownLeft, Search, Plus, Sparkles, X } from 'lucide-react';
import { Modal } from './Modal';
import './Modal.css';

/**
 * Keyboard Shortcut Cheatsheet Modal
 */
export function KeyboardShortcutsModal({ isOpen, onClose, t }) {
  const SHORTCUTS = [
    { key: 'Enter', label: 'Send Message (in chat textarea)' },
    { key: 'Shift + Enter', label: 'New Line / Multi-line Prompt' },
    { key: 'Alt + N', label: t.shortcutNewChat || 'Start New Chat Session' },
    { key: 'Ctrl + /', label: t.shortcutHelp || 'Open Keyboard Shortcuts' },
    { key: 'Esc', label: 'Close Open Dialogs / Modals' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t.keyboardShortcuts || 'Keyboard Shortcuts'}
      maxWidth="440px"
    >
      <div className="shortcuts-modal-body">
        <div className="shortcuts-list">
          {SHORTCUTS.map((item, idx) => (
            <div key={idx} className="shortcut-row">
              <span className="shortcut-label">{item.label}</span>
              <kbd className="shortcut-key-badge">{item.key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
