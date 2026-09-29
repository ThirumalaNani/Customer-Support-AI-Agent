import React from 'react';
import './Voice.css';

/**
 * Animated audio waveform visualizer bars when listening
 */
export function VoiceWaveform({ isListening, label = 'Listening...' }) {
  if (!isListening) return null;

  return (
    <div className="voice-waveform-overlay glass-card animate-fade-in" role="status" aria-live="polite">
      <div className="voice-waveform-bars">
        <span className="wave-bar wave-bar-1" />
        <span className="wave-bar wave-bar-2" />
        <span className="wave-bar wave-bar-3" />
        <span className="wave-bar wave-bar-4" />
        <span className="wave-bar wave-bar-5" />
      </div>
      <span className="voice-waveform-label">{label}</span>
    </div>
  );
}
