/**
 * Storage Service for Client-Side State Persistence
 * Handles LocalStorage caching for conversations, customers, memories, feedback, theme, and language.
 */

import { DEMO_CUSTOMERS, DEMO_MEMORIES, DEMO_INITIAL_CONVERSATIONS } from '../data/demoData';

const KEYS = {
  THEME: 'csa_theme',
  LANGUAGE: 'csa_ui_language',
  CUSTOMERS: 'csa_customers_v2',
  CONVERSATIONS: 'csa_conversations_v2',
  ACTIVE_THREAD: 'csa_active_thread_v2',
  MEMORIES: 'csa_memories_v2',
  FEEDBACK: 'csa_feedback_v2',
};

// Safe LocalStorage helpers
function getItem(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return defaultValue;
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`Error reading localStorage key "${key}":`, e);
    return defaultValue;
  }
}

function setItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Error writing localStorage key "${key}":`, e);
  }
}

/** Theme Preference */
export function getStoredTheme() {
  const saved = getItem(KEYS.THEME, null);
  if (saved) return saved;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function setStoredTheme(theme) {
  setItem(KEYS.THEME, theme);
  document.documentElement.setAttribute('data-theme', theme);
}

/** UI Language Preference */
export function getStoredLanguage() {
  return getItem(KEYS.LANGUAGE, 'en');
}

export function setStoredLanguage(lang) {
  setItem(KEYS.LANGUAGE, lang);
}

/** Customers Management */
export function getStoredCustomers() {
  const stored = getItem(KEYS.CUSTOMERS, null);
  if (stored && Array.isArray(stored) && stored.length > 0) {
    return stored;
  }
  // Initialize with rich demo customers
  setItem(KEYS.CUSTOMERS, DEMO_CUSTOMERS);
  return DEMO_CUSTOMERS;
}

export function saveStoredCustomers(customers) {
  setItem(KEYS.CUSTOMERS, customers);
}

export function updateCustomerLanguage(customerId, language) {
  const customers = getStoredCustomers();
  const updated = customers.map((c) => {
    if (c.id === customerId) {
      return { ...c, preferredLanguage: language };
    }
    return c;
  });
  saveStoredCustomers(updated);
  return updated;
}

/** Conversations Management */
export function getStoredConversations() {
  const stored = getItem(KEYS.CONVERSATIONS, null);
  if (stored && typeof stored === 'object' && Object.keys(stored).length > 0) {
    return stored;
  }
  // Initialize with rich initial demo conversations
  setItem(KEYS.CONVERSATIONS, DEMO_INITIAL_CONVERSATIONS);
  return DEMO_INITIAL_CONVERSATIONS;
}

export function saveStoredConversations(conversations) {
  setItem(KEYS.CONVERSATIONS, conversations);
}

/** Memories Store (Overrides & Admin Modifications) */
export function getStoredMemories() {
  const stored = getItem(KEYS.MEMORIES, null);
  if (stored && typeof stored === 'object' && Object.keys(stored).length > 0) {
    return stored;
  }
  setItem(KEYS.MEMORIES, DEMO_MEMORIES);
  return DEMO_MEMORIES;
}

export function saveStoredMemories(memories) {
  setItem(KEYS.MEMORIES, memories);
}

export function deleteCustomerMemories(customerId) {
  const memories = getStoredMemories();
  const updated = {
    ...memories,
    [customerId]: [],
  };
  saveStoredMemories(updated);
  return updated;
}

/** Feedback Store */
export function getStoredFeedback() {
  return getItem(KEYS.FEEDBACK, []);
}

export function recordFeedback(feedbackObj) {
  const existing = getStoredFeedback();
  const updated = [
    {
      ...feedbackObj,
      timestamp: new Date().toISOString(),
      id: `fb_${Date.now()}`,
    },
    ...existing,
  ];
  setItem(KEYS.FEEDBACK, updated);
  return updated;
}
