import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for Web Speech Recognition & Speech Synthesis
 * Supports language-aware speech recognition (en-US, te-IN, hi-IN) and audio playback.
 */
export function useVoice({ language = 'en', onSpeechResult } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [voiceSupported, setVoiceSupported] = useState(true);

  const recognitionRef = useRef(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;

    // Set recognition language based on active language
    const langMap = {
      en: 'en-US',
      te: 'te-IN',
      hi: 'hi-IN',
    };
    recognition.lang = langMap[language] || 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const resultText = finalTranscript || interimTranscript;
      if (onSpeechResult && resultText) {
        onSpeechResult(resultText, Boolean(finalTranscript));
      }
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    };
  }, [language, onSpeechResult]);

  // Toggle Voice Input
  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    } else {
      try {
        const langMap = {
          en: 'en-US',
          te: 'te-IN',
          hi: 'hi-IN',
        };
        recognitionRef.current.lang = langMap[language] || 'en-US';
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Could not start speech recognition:', err);
      }
    }
  }, [isListening, language]);

  // Speak Response via Speech Synthesis
  const speakText = useCallback(
    (text, messageId = null) => {
      if (!('speechSynthesis' in window)) return;

      if (isSpeaking && speakingMessageId === messageId) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        setSpeakingMessageId(null);
        return;
      }

      window.speechSynthesis.cancel(); // cancel any active speech

      // Clean markdown tags for natural speech
      const cleanText = text
        .replace(/```[\s\S]*?```/g, 'Code block omitted.')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/[*#_>]/g, '')
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);

      // Select matching voice for language
      const langCode = language === 'te' ? 'te-IN' : language === 'hi' ? 'hi-IN' : 'en-US';
      utterance.lang = langCode;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const matchedVoice = voices.find((v) => v.lang.startsWith(langCode) || v.lang.includes(langCode));
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        setSpeakingMessageId(messageId);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setSpeakingMessageId(null);
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        setSpeakingMessageId(null);
      };

      window.speechSynthesis.speak(utterance);
    },
    [isSpeaking, speakingMessageId, language]
  );

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    }
  }, []);

  return {
    isListening,
    toggleListening,
    isSpeaking,
    speakingMessageId,
    speakText,
    stopSpeaking,
    voiceSupported,
  };
}
