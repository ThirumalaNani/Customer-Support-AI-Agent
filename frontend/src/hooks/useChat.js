import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  fetchCustomers,
  fetchCustomerHistory,
  fetchSystemStatus,
  sendChatMessage,
} from '../services/api';
import {
  getStoredTheme,
  setStoredTheme,
  getStoredLanguage,
  setStoredLanguage,
  getStoredCustomers,
  saveStoredCustomers,
  updateCustomerLanguage,
  getStoredConversations,
  saveStoredConversations,
  getStoredMemories,
  saveStoredMemories,
  deleteCustomerMemories,
  recordFeedback,
  getStoredFeedback,
} from '../services/storage';
import { DEMO_CUSTOMERS, DEMO_MEMORIES, DEMO_ANALYTICS_DATA } from '../data/demoData';
import { TRANSLATIONS } from '../i18n/translations';

const DEFAULT_SESSION_DURATION = 900; // 15 minutes (900s)

export function useChat() {
  // 1. Theme and Language
  const [theme, setTheme] = useState(getStoredTheme);
  const [language, setLanguage] = useState(getStoredLanguage);

  // 2. Active View ('chat' | 'memory' | 'customer' | 'knowledge' | 'analytics' | 'admin')
  const [activeView, setActiveView] = useState('chat');

  // 3. Customers & Authentication
  const [customers, setCustomers] = useState(getStoredCustomers);
  const [activeCustomerId, setActiveCustomerId] = useState('alex_chen');
  const [activeCustomer, setActiveCustomer] = useState(null);

  // Current authenticated user session
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('contextual_auth_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.expiresAt > Date.now()) {
          return parsed.user;
        }
      }
    } catch {
      // ignore
    }
    return {
      id: 'alex_chen',
      name: 'Alex Chen',
      role: 'Infrastructure Lead',
      company: 'CloudCore Inc.',
      email: 'alex.chen@cloudcore.io',
      tier: 'Enterprise Tier',
      authRole: 'customer', // 'customer' | 'admin'
      preferredLanguage: 'en',
    };
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [sessionRemainingTime, setSessionRemainingTime] = useState(DEFAULT_SESSION_DURATION);
  const [isSessionWarningOpen, setIsSessionWarningOpen] = useState(false);

  // 4. Conversations: { [customerId]: Array<{ id, title, createdAt, messages: [] }> }
  const [conversationsMap, setConversationsMap] = useState(getStoredConversations);
  const [activeThreadId, setActiveThreadId] = useState('');
  const [conversationSearchQuery, setConversationSearchQuery] = useState('');

  // 5. Memory Partition Store: { [customerId]: Array<{ id, date, category, text, confidence, source }> }
  const [memoriesMap, setMemoriesMap] = useState(getStoredMemories);

  // 6. Recalled History Cache for Active Context
  const [activeRecalledHistory, setActiveRecalledHistory] = useState([]);

  // 7. System & Transmission State
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [systemStatus, setSystemStatus] = useState(null);
  const [retentionState, setRetentionState] = useState({
    active: true,
    lastRetained: true,
    statusText: 'Ready to persist ongoing interactions',
  });
  const [errorToast, setErrorToast] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  // Apply theme to DOM
  useEffect(() => {
    setStoredTheme(theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const changeLanguage = useCallback((newLang) => {
    setLanguage(newLang);
    setStoredLanguage(newLang);
  }, []);

  // Save session helper
  const persistSession = useCallback((user) => {
    const sessionObj = {
      user,
      expiresAt: Date.now() + DEFAULT_SESSION_DURATION * 1000,
    };
    try {
      localStorage.setItem('contextual_auth_session', JSON.stringify(sessionObj));
    } catch {
      // ignore
    }
  }, []);

  // Session Timeout countdown & Inactivity Monitor
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionRemainingTime((prev) => {
        if (prev <= 1) {
          // Session expired
          logoutUser();
          return 0;
        }
        if (prev === 60) {
          setIsSessionWarningOpen(true);
        }
        return prev - 1;
      });
    }, 1000);

    const handleUserActivity = () => {
      setSessionRemainingTime((prev) => (prev > 0 ? DEFAULT_SESSION_DURATION : 0));
      setIsSessionWarningOpen(false);
    };

    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('mousedown', handleUserActivity);

    return () => {
      clearInterval(timer);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('mousedown', handleUserActivity);
    };
  }, []);

  const extendSession = useCallback(() => {
    setSessionRemainingTime(DEFAULT_SESSION_DURATION);
    setIsSessionWarningOpen(false);
    if (currentUser) {
      persistSession(currentUser);
    }
    setSuccessToast('Session extended by 15 minutes.');
  }, [currentUser, persistSession]);

  // Login User
  const loginUser = useCallback(
    ({ customerId, role = 'customer', language: userLang }) => {
      const cid = customerId.trim().toLowerCase();
      let matched = customers.find((c) => c.id === cid);

      if (!matched) {
        matched = {
          id: cid,
          name: cid.replace(/[_-]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
          role: role === 'admin' ? 'Support Admin Lead' : 'Customer Account Lead',
          company: 'Enterprise Account',
          email: `${cid}@account.local`,
          tier: 'Standard Tier',
          type: 'Custom Account',
          preferredLanguage: userLang || language,
          lastInteractionDate: 'Just now',
          totalInteractions: 1,
          sentiment: 'Neutral',
          summary: `Direct identifier partition: ${cid}`,
          aiCustomerSummary: `Custom memory partition initialized for account ${cid}.`,
          previousIssues: [],
          suggestedPrompts: [
            'Can you check the current status of our open requests?',
            'What environment configuration is on file for this account?',
          ],
        };
        setCustomers((prev) => {
          const next = [...prev, matched];
          saveStoredCustomers(next);
          return next;
        });
      }

      const userObj = {
        ...matched,
        authRole: role,
        preferredLanguage: userLang || matched.preferredLanguage || language,
      };

      setCurrentUser(userObj);
      setActiveCustomerId(cid);
      setActiveCustomer(userObj);
      persistSession(userObj);

      if (userObj.preferredLanguage) {
        setLanguage(userObj.preferredLanguage);
      }

      setSessionRemainingTime(DEFAULT_SESSION_DURATION);
      setIsSessionWarningOpen(false);
      setSuccessToast(`Signed in as ${userObj.name} (${userObj.id})`);

      loadCustomerInitialHistory(cid);
    },
    [customers, language, persistSession]
  );

  // Logout User
  const logoutUser = useCallback(() => {
    try {
      localStorage.removeItem('contextual_auth_session');
    } catch {
      // ignore
    }
    setSessionRemainingTime(0);
    setIsSessionWarningOpen(false);
    setIsAuthModalOpen(true);
    setSuccessToast('You have signed out.');
  }, []);

  // Sync Customer list on mount and query backend status
  useEffect(() => {
    let isMounted = true;

    async function initBackend() {
      try {
        const [statusData, backendCustData] = await Promise.all([
          fetchSystemStatus().catch(() => ({
            agent_name: 'Support Assistant',
            llm_provider: 'gemini',
            llm_model: null,
            llm_configured: false,
            llm_status: 'unknown',
            history_provider: 'hindsight',
            status: 'degraded',
          })),
          fetchCustomers().catch(() => ({ customers: [] })),
        ]);

        if (!isMounted) return;
        setSystemStatus(statusData);

        // Merge backend customers with rich local demo data
        const localList = getStoredCustomers();
        const backendList = backendCustData.customers || [];

        const mergedMap = new Map();
        localList.forEach((c) => mergedMap.set(c.id, c));
        backendList.forEach((bc) => {
          if (!mergedMap.has(bc.id)) {
            mergedMap.set(bc.id, {
              ...bc,
              company: 'Enterprise Account',
              email: `${bc.id}@example.com`,
              tier: 'Enterprise Tier',
              preferredLanguage: 'en',
              lastInteractionDate: 'Recently',
              totalInteractions: 1,
              sentiment: 'Neutral',
              aiCustomerSummary: bc.summary || 'Customer account on file.',
              previousIssues: [],
              suggestedPrompts: [
                'How can I troubleshoot my service configuration?',
                'What are our current quota limits?',
              ],
            });
          }
        });

        const finalList = Array.from(mergedMap.values());
        setCustomers(finalList);
        saveStoredCustomers(finalList);

        // Set active customer
        const initialCid = currentUser?.id || finalList[0]?.id || 'alex_chen';
        setActiveCustomerId(initialCid);
        const initialCust = finalList.find((c) => c.id === initialCid) || finalList[0];
        setActiveCustomer(initialCust);

        if (initialCust?.preferredLanguage) {
          setLanguage(initialCust.preferredLanguage);
        }

        // Initialize active conversation thread
        const threads = conversationsMap[initialCid] || [];
        if (threads.length > 0) {
          setActiveThreadId(threads[0].id);
        } else {
          const newThreadId = `conv_${initialCid}_${Date.now()}`;
          const newThread = {
            id: newThreadId,
            title: `Support Session - ${new Date().toLocaleDateString()}`,
            createdAt: new Date().toISOString(),
            messages: [],
          };
          setConversationsMap((prev) => {
            const next = { ...prev, [initialCid]: [newThread] };
            saveStoredConversations(next);
            return next;
          });
          setActiveThreadId(newThreadId);
        }

        loadCustomerInitialHistory(initialCid);
      } catch (err) {
        if (isMounted) {
          setErrorToast(`System status check: ${err.message}`);
        }
      }
    }

    initBackend();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch baseline memory history from backend or demo store
  const loadCustomerInitialHistory = useCallback(
    async (cid) => {
      if (!cid) return;
      setIsLoadingHistory(true);
      try {
        const data = await fetchCustomerHistory(cid).catch(() => ({ history: [] }));
        const backendHistory = data.history || [];

        const localMemories = memoriesMap[cid] || [];
        const memoryTexts = localMemories.map((m) => m.text);

        const combined = Array.from(new Set([...backendHistory, ...memoryTexts]));
        setActiveRecalledHistory(combined);
      } catch (err) {
        console.warn(`Could not recall history for ${cid}:`, err);
        const localMemories = memoriesMap[cid] || [];
        setActiveRecalledHistory(localMemories.map((m) => m.text));
      } finally {
        setIsLoadingHistory(false);
      }
    },
    [memoriesMap]
  );

  // Switch Active Customer
  const switchCustomer = useCallback(
    (customerOrId) => {
      let cid = '';
      let customObj = null;

      if (typeof customerOrId === 'string') {
        cid = customerOrId.trim();
        const existing = customers.find((c) => c.id === cid);
        if (existing) {
          customObj = existing;
        } else {
          customObj = {
            id: cid,
            name: cid.replace(/[_-]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
            role: 'Custom Account Lead',
            company: 'Direct Session',
            email: `${cid}@account.local`,
            tier: 'Standard Tier',
            type: 'Custom Account',
            preferredLanguage: language,
            lastInteractionDate: 'Just now',
            totalInteractions: 1,
            sentiment: 'Neutral',
            summary: `Direct identifier partition: ${cid}`,
            aiCustomerSummary: `Custom memory partition initialized for account ${cid}.`,
            previousIssues: [],
            suggestedPrompts: [
              'Can you check the current status of our open requests?',
              'What environment configuration is on file for this account?',
            ],
          };
          setCustomers((prev) => {
            const next = [...prev, customObj];
            saveStoredCustomers(next);
            return next;
          });
        }
      } else if (customerOrId && customerOrId.id) {
        cid = customerOrId.id;
        customObj = customerOrId;
      }

      if (!cid) return;

      setActiveCustomerId(cid);
      setActiveCustomer(customObj);
      setCurrentUser(customObj);
      persistSession(customObj);

      if (customObj?.preferredLanguage) {
        setLanguage(customObj.preferredLanguage);
      }

      const threads = conversationsMap[cid] || [];
      if (threads.length > 0) {
        setActiveThreadId(threads[0].id);
      } else {
        const newThreadId = `conv_${cid}_${Date.now()}`;
        const newThread = {
          id: newThreadId,
          title: `Session - ${customObj?.name || cid}`,
          createdAt: new Date().toISOString(),
          messages: [],
        };
        setConversationsMap((prev) => {
          const next = { ...prev, [cid]: [newThread] };
          saveStoredConversations(next);
          return next;
        });
        setActiveThreadId(newThreadId);
      }

      loadCustomerInitialHistory(cid);
    },
    [customers, conversationsMap, language, loadCustomerInitialHistory, persistSession]
  );

  // Update Customer's Preferred Language
  const setCustomerPreferredLanguage = useCallback(
    (cid, newLang) => {
      const updated = updateCustomerLanguage(cid, newLang);
      setCustomers(updated);
      if (activeCustomerId === cid) {
        setActiveCustomer((prev) => (prev ? { ...prev, preferredLanguage: newLang } : null));
        setCurrentUser((prev) => (prev ? { ...prev, preferredLanguage: newLang } : null));
        setLanguage(newLang);
      }
      setSuccessToast(`Preferred language updated to ${newLang.toUpperCase()}`);
    },
    [activeCustomerId]
  );

  // Create a New Chat Thread
  const createNewChat = useCallback(() => {
    if (!activeCustomerId) return;
    const newThreadId = `conv_${activeCustomerId}_${Date.now()}`;
    const newThread = {
      id: newThreadId,
      title: `New Session (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
      createdAt: new Date().toISOString(),
      messages: [],
    };

    setConversationsMap((prev) => {
      const currentThreads = prev[activeCustomerId] || [];
      const next = {
        ...prev,
        [activeCustomerId]: [newThread, ...currentThreads],
      };
      saveStoredConversations(next);
      return next;
    });

    setActiveThreadId(newThreadId);
    setSuccessToast('Started a new conversation');
  }, [activeCustomerId]);

  // Delete a Conversation Thread
  const deleteConversation = useCallback(
    (threadId) => {
      if (!activeCustomerId) return;
      setConversationsMap((prev) => {
        const currentThreads = prev[activeCustomerId] || [];
        const filtered = currentThreads.filter((t) => t.id !== threadId);
        const next = {
          ...prev,
          [activeCustomerId]: filtered,
        };
        saveStoredConversations(next);
        return next;
      });

      if (activeThreadId === threadId) {
        const remaining = (conversationsMap[activeCustomerId] || []).filter((t) => t.id !== threadId);
        if (remaining.length > 0) {
          setActiveThreadId(remaining[0].id);
        } else {
          createNewChat();
        }
      }
    },
    [activeCustomerId, activeThreadId, conversationsMap, createNewChat]
  );

  // Current Active Thread Messages
  const activeThread = useMemo(() => {
    const threads = conversationsMap[activeCustomerId] || [];
    return threads.find((t) => t.id === activeThreadId) || threads[0] || null;
  }, [conversationsMap, activeCustomerId, activeThreadId]);

  const activeMessages = activeThread ? activeThread.messages : [];

  // Send a Message with optional attached files
  const sendMessage = useCallback(
    async (messageText, attachedFiles = [], options = {}) => {
      const { skipUserMessage = false } = options;
      const cleanText = (messageText || '').trim();
      if ((!cleanText && attachedFiles.length === 0) || !activeCustomerId || isSending) return;

      const userMessage = {
        id: `msg_user_${Date.now()}`,
        sender: 'user',
        text: cleanText || (attachedFiles.length > 0 ? `Attached ${attachedFiles.length} file(s)` : ''),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        attachments: attachedFiles,
      };

      let currentTid = activeThreadId;

      if (!currentTid || !activeThread) {
        currentTid = `conv_${activeCustomerId}_${Date.now()}`;
        const newThread = {
          id: currentTid,
          title: (cleanText || 'File Analysis').slice(0, 42) + (cleanText.length > 42 ? '...' : ''),
          createdAt: new Date().toISOString(),
          messages: skipUserMessage ? [] : [userMessage],
        };
        setConversationsMap((prev) => {
          const next = {
            ...prev,
            [activeCustomerId]: [newThread, ...(prev[activeCustomerId] || [])],
          };
          saveStoredConversations(next);
          return next;
        });
        setActiveThreadId(currentTid);
      } else if (!skipUserMessage) {
        setConversationsMap((prev) => {
          const threads = prev[activeCustomerId] || [];
          const updated = threads.map((t) => {
            if (t.id === currentTid) {
              const isFirst = t.messages.length === 0;
              return {
                ...t,
                title: isFirst
                  ? (cleanText || 'File Analysis').slice(0, 42) + (cleanText.length > 42 ? '...' : '')
                  : t.title,
                messages: [...t.messages, userMessage],
              };
            }
            return t;
          });
          const next = { ...prev, [activeCustomerId]: updated };
          saveStoredConversations(next);
          return next;
        });
      }

      setIsSending(true);

      try {
        let messageToSend = cleanText;

        // If file attachments exist, append summarized file context
        if (attachedFiles.length > 0) {
          const fileNotices = attachedFiles
            .map((f) => `[File: ${f.name} (${f.size}) ${f.contentSnippet ? `- ${f.contentSnippet}` : ''}]`)
            .join(' ');
          messageToSend = `${messageToSend} ${fileNotices}`.trim();
        }

        // Language guidance injection
        if (activeCustomer?.preferredLanguage === 'te' && !/[ఁ-౯]/.test(cleanText)) {
          messageToSend = `${messageToSend} (Please respond in Telugu if appropriate for the customer)`;
        } else if (activeCustomer?.preferredLanguage === 'hi' && !/[ऀ-ॿ]/.test(cleanText)) {
          messageToSend = `${messageToSend} (Please respond in Hindi if appropriate for the customer)`;
        }

        const chatResponse = await sendChatMessage(activeCustomerId, messageToSend, {
          conversationId: currentTid,
          memoryEnabled: true,
        });

        if (Array.isArray(chatResponse.recalled_history)) {
          setActiveRecalledHistory(chatResponse.recalled_history);
        }

        setRetentionState({
          active: true,
          lastRetained: chatResponse.history_retained !== false,
          statusText:
            chatResponse.history_retained !== false
              ? 'Interaction persisted to customer history'
              : 'Interaction completed (retention failed to commit)',
        });

        const agentMessage = {
          id: `msg_agent_${Date.now()}`,
          sender: 'agent',
          text: chatResponse.response,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          recalledCount: chatResponse.recalled_history ? chatResponse.recalled_history.length : 0,
          recalledMemories: chatResponse.recalled_history || [],
          historyRetained: chatResponse.history_retained,
          feedback: null,
        };

        setConversationsMap((prev) => {
          const threads = prev[activeCustomerId] || [];
          const updated = threads.map((t) => {
            if (t.id === currentTid) {
              return {
                ...t,
                messages: [...t.messages, agentMessage],
              };
            }
            return t;
          });
          const next = { ...prev, [activeCustomerId]: updated };
          saveStoredConversations(next);
          return next;
        });

        // Update active customer interaction stats
        setCustomers((prev) => {
          const next = prev.map((c) => {
            if (c.id === activeCustomerId) {
              return {
                ...c,
                totalInteractions: (c.totalInteractions || 1) + 1,
                lastInteractionDate: 'Just now',
              };
            }
            return c;
          });
          saveStoredCustomers(next);
          return next;
        });
      } catch (err) {
        console.error('Chat error:', err);
        const errorMessage = {
          id: `msg_err_${Date.now()}`,
          sender: 'system_error',
          text: err.message || 'The support agent is currently unavailable. Please retry.',
          errorCode: err.code || 'provider_error',
          retryable: err.retryable !== false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setConversationsMap((prev) => {
          const threads = prev[activeCustomerId] || [];
          const updated = threads.map((t) => {
            if (t.id === currentTid) {
              return {
                ...t,
                messages: [...t.messages, errorMessage],
              };
            }
            return t;
          });
          const next = { ...prev, [activeCustomerId]: updated };
          saveStoredConversations(next);
          return next;
        });

        // The in-thread error card is the primary error surface; avoid stacking
        // the same provider failure as a duplicate global toast.
      } finally {
        setIsSending(false);
      }
    },
    [activeCustomerId, activeThreadId, activeThread, activeCustomer, isSending]
  );

  // Retry the latest failed request without duplicating the customer's message.
  const retryLastRequest = useCallback(async () => {
    if (!activeThread || activeMessages.length === 0 || isSending) return;
    const lastUserMsg = [...activeMessages].reverse().find((m) => m.sender === 'user');
    if (!lastUserMsg) return;

    setConversationsMap((prev) => {
      const threads = prev[activeCustomerId] || [];
      const updated = threads.map((t) => ({
        ...t,
        messages: t.id === activeThreadId
          ? t.messages.filter((m) => m.sender !== 'system_error')
          : t.messages,
      }));
      const next = { ...prev, [activeCustomerId]: updated };
      saveStoredConversations(next);
      return next;
    });

    await sendMessage(lastUserMsg.text, lastUserMsg.attachments || [], { skipUserMessage: true });
  }, [activeThread, activeMessages, isSending, activeCustomerId, activeThreadId, sendMessage]);

  // Regenerate Response for the Latest Agent Message
  const regenerateResponse = useCallback(async () => {
    if (!activeThread || activeMessages.length === 0 || isSending) return;
    const lastUserMsg = [...activeMessages].reverse().find((m) => m.sender === 'user');
    if (!lastUserMsg) return;
    await sendMessage(lastUserMsg.text, lastUserMsg.attachments || []);
  }, [activeThread, activeMessages, isSending, sendMessage]);

  // Submit Feedback on an Agent Message
  const submitMessageFeedback = useCallback(
    (messageId, feedbackData) => {
      if (!activeCustomerId || !activeThreadId) return;

      setConversationsMap((prev) => {
        const threads = prev[activeCustomerId] || [];
        const updated = threads.map((t) => {
          if (t.id === activeThreadId) {
            return {
              ...t,
              messages: t.messages.map((m) => {
                if (m.id === messageId) {
                  return {
                    ...m,
                    feedback: {
                      ...(m.feedback || {}),
                      ...feedbackData,
                    },
                  };
                }
                return m;
              }),
            };
          }
          return t;
        });
        const next = { ...prev, [activeCustomerId]: updated };
        saveStoredConversations(next);
        return next;
      });

      recordFeedback({
        customerId: activeCustomerId,
        threadId: activeThreadId,
        messageId,
        ...feedbackData,
      });

      setSuccessToast(TRANSLATIONS[language]?.feedbackRecorded || 'Thank you! Feedback recorded.');
    },
    [activeCustomerId, activeThreadId, language]
  );

  // Admin Action: Delete Customer Memory
  const handleDeleteCustomerMemory = useCallback(
    (customerId) => {
      const cid = customerId || activeCustomerId;
      if (!cid) return;

      const updatedMemories = deleteCustomerMemories(cid);
      setMemoriesMap(updatedMemories);
      if (activeCustomerId === cid) {
        setActiveRecalledHistory([]);
      }
      setSuccessToast(TRANSLATIONS[language]?.memoryDeletedSuccess || 'Customer memory successfully erased.');
    },
    [activeCustomerId, language]
  );

  // Export Conversation History (JSON, CSV, Markdown)
  const exportConversationHistory = useCallback(
    (format = 'json') => {
      const exportData = {
        exportTimestamp: new Date().toISOString(),
        activeCustomer,
        conversations: conversationsMap,
        memories: memoriesMap,
        feedback: getStoredFeedback(),
      };

      let content = '';
      let filename = `support-conversations-export-${Date.now()}`;
      let mimeType = 'application/json';

      if (format === 'json') {
        content = JSON.stringify(exportData, null, 2);
        filename += '.json';
      } else if (format === 'csv') {
        mimeType = 'text/csv';
        filename += '.csv';
        content = 'Customer ID,Session ID,Session Title,Date,Sender,Message,Recalled Count\n';
        Object.entries(conversationsMap).forEach(([cid, threads]) => {
          threads.forEach((t) => {
            t.messages.forEach((m) => {
              const safeText = `"${(m.text || '').replace(/"/g, '""')}"`;
              const safeTitle = `"${(t.title || '').replace(/"/g, '""')}"`;
              content += `${cid},${t.id},${safeTitle},${m.timestamp},${m.sender},${safeText},${m.recalledCount || 0}\n`;
            });
          });
        });
      } else {
        mimeType = 'text/markdown';
        filename += '.md';
        content = `# AI Customer Support Conversations Export\nGenerated: ${exportData.exportTimestamp}\n\n`;
        Object.entries(conversationsMap).forEach(([cid, threads]) => {
          content += `## Customer: ${cid}\n\n`;
          threads.forEach((t) => {
            content += `### Session: ${t.title} (${t.createdAt})\n\n`;
            t.messages.forEach((m) => {
              content += `**${m.sender.toUpperCase()}** (${m.timestamp}):\n${m.text}\n\n`;
              if (m.recalledMemories && m.recalledMemories.length > 0) {
                content += `> Recalled Memories: ${m.recalledMemories.join(' | ')}\n\n`;
              }
            });
            content += `---\n\n`;
          });
        });
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccessToast(`Exported history as ${format.toUpperCase()}`);
    },
    [activeCustomer, conversationsMap, memoriesMap]
  );

  // Clear current active conversation view
  const clearCurrentChat = useCallback(() => {
    if (!activeCustomerId || !activeThreadId) return;
    setConversationsMap((prev) => {
      const threads = prev[activeCustomerId] || [];
      const updated = threads.map((t) => {
        if (t.id === activeThreadId) {
          return { ...t, messages: [] };
        }
        return t;
      });
      const next = { ...prev, [activeCustomerId]: updated };
      saveStoredConversations(next);
      return next;
    });
    setSuccessToast('Chat view cleared');
  }, [activeCustomerId, activeThreadId]);

  // Ask AI Fallback from Knowledge Base
  const handleAskAiFromKb = useCallback(
    (promptText) => {
      setActiveView('chat');
      if (promptText) {
        sendMessage(promptText);
      }
    },
    [sendMessage]
  );

  // Filtered conversation threads for sidebar search
  const filteredThreads = useMemo(() => {
    const threads = conversationsMap[activeCustomerId] || [];
    if (!conversationSearchQuery.trim()) return threads;
    const q = conversationSearchQuery.toLowerCase();
    return threads.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.messages.some((m) => m.text.toLowerCase().includes(q))
    );
  }, [conversationsMap, activeCustomerId, conversationSearchQuery]);

  // Active suggested prompts
  const activeSuggestedPrompts = useMemo(() => {
    if (activeCustomer?.suggestedPrompts && activeCustomer.suggestedPrompts.length > 0) {
      return activeCustomer.suggestedPrompts;
    }
    return [
      'Can you check the current status of our open requests?',
      'What environment configuration is on file for this account?',
      'How do we troubleshoot connectivity issues?',
    ];
  }, [activeCustomer]);

  // Computed Analytics Metrics
  const analyticsData = useMemo(() => {
    let totalConvs = 0;
    let totalMessages = 0;
    Object.values(conversationsMap).forEach((threads) => {
      totalConvs += threads.length;
      threads.forEach((t) => {
        totalMessages += t.messages.length;
      });
    });

    let totalMemories = 0;
    Object.values(memoriesMap).forEach((memList) => {
      totalMemories += memList.length;
    });

    const feedbackList = getStoredFeedback();
    const ratedList = feedbackList.filter((f) => f.rating);
    const avgCsat =
      ratedList.length > 0
        ? (ratedList.reduce((acc, f) => acc + f.rating, 0) / ratedList.length).toFixed(2)
        : DEMO_ANALYTICS_DATA.csatScore;

    return {
      totalConversations: Math.max(totalConvs, DEMO_ANALYTICS_DATA.totalConversations),
      totalCustomers: customers.length,
      memoriesStored: Math.max(totalMemories, DEMO_ANALYTICS_DATA.memoriesStored),
      avgResponseTimeMs: DEMO_ANALYTICS_DATA.avgResponseTimeMs,
      csatScore: avgCsat,
      recallHitRatePercent: DEMO_ANALYTICS_DATA.recallHitRatePercent,
      sentimentDistribution: DEMO_ANALYTICS_DATA.sentimentDistribution,
      trendData: DEMO_ANALYTICS_DATA.trendData,
      categoryBreakdown: DEMO_ANALYTICS_DATA.categoryBreakdown,
    };
  }, [conversationsMap, memoriesMap, customers]);

  return {
    // Theme & Language
    theme,
    toggleTheme,
    language,
    changeLanguage,
    t: TRANSLATIONS[language] || TRANSLATIONS.en,

    // Authentication & Session
    currentUser,
    isAuthModalOpen,
    setIsAuthModalOpen,
    sessionRemainingTime,
    isSessionWarningOpen,
    loginUser,
    logoutUser,
    extendSession,

    // Navigation & Views
    activeView,
    setActiveView,
    handleAskAiFromKb,

    // Customers
    customers,
    activeCustomerId,
    activeCustomer,
    switchCustomer,
    setCustomerPreferredLanguage,

    // Conversations & Threads
    conversationsMap,
    activeThreadId,
    setActiveThreadId,
    activeThread,
    messages: activeMessages,
    filteredThreads,
    conversationSearchQuery,
    setConversationSearchQuery,
    createNewChat,
    deleteConversation,
    clearCurrentChat,

    // Transmission & Prompts
    isSending,
    suggestedPrompts: activeSuggestedPrompts,
    sendMessage,
    regenerateResponse,
    retryLastRequest,

    // Memory Visualization
    memoriesMap,
    recalledHistory: activeRecalledHistory,
    isLoadingHistory,
    retentionState,
    handleDeleteCustomerMemory,

    // Feedback
    submitMessageFeedback,

    // Admin & Analytics
    analyticsData,
    exportConversationHistory,

    // System Status & Toasts
    systemStatus,
    errorToast,
    clearErrorToast: () => setErrorToast(null),
    successToast,
    clearSuccessToast: () => setSuccessToast(null),
  };
}
