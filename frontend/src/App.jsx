import React, { useState, useEffect } from 'react';
import { useChat } from './hooks/useChat';
import { Header } from './components/Header/Header';
import { CustomerSwitcher } from './components/CustomerSwitcher/CustomerSwitcher';
import { ConversationSidebar } from './components/Sidebar/ConversationSidebar';
import { ConversationView } from './components/Chat/ConversationView';
import { RecallContextPanel } from './components/RecallContext/RecallContextPanel';
import { MemoryVisualizationPanel } from './components/MemoryVisualization/MemoryVisualizationPanel';
import { CustomerProfileCard } from './components/CustomerProfile/CustomerProfileCard';
import { KnowledgeBaseView } from './components/KnowledgeBase/KnowledgeBaseView';
import { AnalyticsDashboard } from './components/Analytics/AnalyticsDashboard';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { AuthModal } from './components/Auth/AuthModal';
import { SessionTimeoutModal } from './components/Auth/SessionTimeoutModal';
import { OfflineBanner } from './components/UI/OfflineBanner';
import { KeyboardShortcutsModal } from './components/UI/KeyboardShortcutsModal';
import { Toast } from './components/UI/Toast';
import './App.css';

export function App() {
  const {
    // Theme & Language
    theme,
    toggleTheme,
    language,
    changeLanguage,
    t,

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

    // Conversations
    conversationsMap,
    activeThreadId,
    setActiveThreadId,
    activeThread,
    messages,
    filteredThreads,
    conversationSearchQuery,
    setConversationSearchQuery,
    createNewChat,
    deleteConversation,
    clearCurrentChat,

    // Transmission
    isSending,
    suggestedPrompts,
    sendMessage,
    regenerateResponse,
    retryLastRequest,

    // Memory
    memoriesMap,
    recalledHistory,
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
    clearErrorToast,
    successToast,
    clearSuccessToast,
  } = useChat();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [showRecalledContext, setShowRecalledContext] = useState(false);

  // Global Keyboard Shortcuts (Ctrl + / for Help, Alt + N for New Chat)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
      } else if (e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        createNewChat();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createNewChat]);

  return (
    <div className="app-layout" data-theme={theme}>
      {/* Offline Connectivity Banner */}
      <OfflineBanner t={t} />

      {/* 1. Global Navigation Header */}
      <Header
        systemStatus={systemStatus}
        theme={theme}
        onToggleTheme={toggleTheme}
        language={language}
        onChangeLanguage={changeLanguage}
        activeView={activeView}
        onSelectView={setActiveView}
        currentUser={currentUser}
        sessionRemainingTime={sessionRemainingTime}
        onOpenLoginModal={() => setIsAuthModalOpen(true)}
        onLogout={logoutUser}
        t={t}
      />

      {/* 2. Main Customer Switcher Bar (Visible for Chat, Memory, and Customer Profile views) */}
      {(activeView === 'chat' || activeView === 'memory' || activeView === 'customer') && (
        <CustomerSwitcher
          customers={customers}
          activeCustomer={activeCustomer}
          activeCustomerId={activeCustomerId}
          onSelectCustomer={switchCustomer}
          recalledCount={recalledHistory?.length || 0}
          showRecalledContext={showRecalledContext}
          onToggleRecalledContext={() => setShowRecalledContext((prev) => !prev)}
          t={t}
        />
      )}

      {/* 3. Main Workspace Area Switcher */}
      <main className="app-main-workspace">
        <div className="workspace-container">
          {/* VIEW 1: CHAT WORKSPACE */}
          {activeView === 'chat' && (
            <div className={`chat-workspace-layout ${showRecalledContext ? 'chat-workspace-layout--with-context' : 'chat-workspace-layout--clean'} animate-fade-in`}>
              {/* Left Column: Conversation Threads Sidebar */}
              <ConversationSidebar
                conversations={filteredThreads}
                activeThreadId={activeThreadId}
                onSelectThread={setActiveThreadId}
                onCreateNewChat={createNewChat}
                onDeleteThread={deleteConversation}
                searchQuery={conversationSearchQuery}
                onSearchChange={setConversationSearchQuery}
                activeCustomer={activeCustomer}
                t={t}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
              />

              {/* Center Column: Active Conversation Chat */}
              <div className="chat-workspace-center">
                <ConversationView
                  messages={messages}
                  activeCustomer={activeCustomer}
                  activeCustomerId={activeCustomerId}
                  suggestedPrompts={suggestedPrompts}
                  isSending={isSending}
                  onSendMessage={sendMessage}
                  onClearChat={clearCurrentChat}
                  onRegenerate={regenerateResponse}
                  onRetry={retryLastRequest}
                  onSubmitFeedback={submitMessageFeedback}
                  onCreateNewChat={createNewChat}
                  recalledHistory={recalledHistory}
                  retentionState={retentionState}
                  showRecalledContext={showRecalledContext}
                  onToggleRecalledContext={() => setShowRecalledContext((prev) => !prev)}
                  language={language}
                  systemStatus={systemStatus}
                  t={t}
                />
              </div>

              {/* Right Column: Real-Time Contextual Memory Inspector (On-Demand) */}
              {showRecalledContext && (
                <div className="chat-workspace-right animate-fade-in">
                  <RecallContextPanel
                    recalledHistory={recalledHistory}
                    activeCustomer={activeCustomer}
                    activeCustomerId={activeCustomerId}
                    isLoadingHistory={isLoadingHistory}
                    retentionState={retentionState}
                    onClose={() => setShowRecalledContext(false)}
                    t={t}
                  />
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: MEMORY VISUALIZATION (Pipeline Flow + Timeline) */}
          {activeView === 'memory' && (
            <MemoryVisualizationPanel
              recalledHistory={recalledHistory}
              memoriesMap={memoriesMap}
              activeCustomer={activeCustomer}
              activeCustomerId={activeCustomerId}
              isLoadingHistory={isLoadingHistory}
              retentionState={retentionState}
              onDeleteCustomerMemory={handleDeleteCustomerMemory}
              t={t}
            />
          )}

          {/* VIEW 3: CUSTOMER 360 PROFILE */}
          {activeView === 'customer' && (
            <CustomerProfileCard
              activeCustomer={activeCustomer}
              activeCustomerId={activeCustomerId}
              onUpdatePreferredLanguage={setCustomerPreferredLanguage}
              t={t}
            />
          )}

          {/* VIEW 4: KNOWLEDGE BASE & FAQS */}
          {activeView === 'knowledge' && (
            <KnowledgeBaseView
              onAskAi={handleAskAiFromKb}
              t={t}
            />
          )}

          {/* VIEW 5: ANALYTICS DASHBOARD */}
          {activeView === 'analytics' && (
            <AnalyticsDashboard
              analyticsData={analyticsData}
              onExportAnalytics={exportConversationHistory}
              t={t}
            />
          )}

          {/* VIEW 6: ADMIN CONSOLE */}
          {activeView === 'admin' && (
            <AdminDashboard
              customers={customers}
              conversationsMap={conversationsMap}
              memoriesMap={memoriesMap}
              onDeleteCustomerMemory={handleDeleteCustomerMemory}
              onExportHistory={exportConversationHistory}
              onSelectCustomer={(c) => {
                switchCustomer(c);
                setActiveView('chat');
              }}
              currentUser={currentUser}
              t={t}
            />
          )}
        </div>
      </main>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLogin={loginUser}
        customers={customers}
        activeCustomerId={activeCustomerId}
        language={language}
        t={t}
      />

      {/* Session Timeout Warning Modal */}
      <SessionTimeoutModal
        isOpen={isSessionWarningOpen}
        remainingSeconds={sessionRemainingTime}
        onExtendSession={extendSession}
        onLogout={logoutUser}
        t={t}
      />

      {/* Keyboard Shortcuts Cheatsheet Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
        t={t}
      />

      {/* Notifications / Toasts */}
      <Toast message={errorToast} onClose={clearErrorToast} />
      {successToast && <Toast message={successToast} onClose={clearSuccessToast} type="success" />}
    </div>
  );
}

export default App;
