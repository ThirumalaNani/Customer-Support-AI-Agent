import React from 'react';
import {
  Plus,
  Search,
  MessageSquare,
  Trash2,
  Calendar,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  User,
} from 'lucide-react';
import { Button } from '../UI/Button';
import { Badge } from '../UI/Badge';
import './Sidebar.css';

export function ConversationSidebar({
  conversations,
  activeThreadId,
  onSelectThread,
  onCreateNewChat,
  onDeleteThread,
  searchQuery,
  onSearchChange,
  activeCustomer,
  t,
  isCollapsed,
  onToggleCollapse,
}) {
  const getInitials = (name) => {
    if (!name) return 'CU';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <aside className={`conv-sidebar glass-panel ${isCollapsed ? 'conv-sidebar--collapsed' : ''}`}>
      {/* Sidebar Header */}
      <div className="sidebar-header">
        {!isCollapsed && (
          <div className="sidebar-title-row">
            <div className="sidebar-title-group">
              <MessageSquare size={16} className="sidebar-title-icon" />
              <h2 className="sidebar-title">{t.conversations}</h2>
            </div>
            <Badge variant="accent" size="xs">
              {conversations.length}
            </Badge>
          </div>
        )}

        <button
          className="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label="Toggle sidebar"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* New Chat Action Button */}
          <div className="sidebar-new-chat-wrapper">
            <Button
              variant="primary"
              size="md"
              className="new-chat-btn"
              onClick={onCreateNewChat}
              icon={Plus}
            >
              {t.newChat}
            </Button>
          </div>

          {/* Search Conversations Input */}
          <div className="sidebar-search-box">
            <Search size={14} className="sidebar-search-icon" />
            <input
              type="text"
              className="sidebar-search-input"
              placeholder={t.searchChats}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {searchQuery && (
              <button
                className="search-clear-btn"
                onClick={() => onSearchChange('')}
                title="Clear search"
              >
                &times;
              </button>
            )}
          </div>

          {/* Active Customer Summary Card in Sidebar */}
          {activeCustomer && (
            <div className="sidebar-customer-summary glass-card">
              <div className="sidebar-customer-avatar">{getInitials(activeCustomer.name)}</div>
              <div className="sidebar-customer-details">
                <span className="sidebar-customer-name">{activeCustomer.name}</span>
                <span className="sidebar-customer-role">{activeCustomer.role}</span>
              </div>
            </div>
          )}

          {/* Conversations List */}
          <div className="sidebar-threads-scroll">
            {conversations.length === 0 ? (
              <div className="sidebar-empty-state">
                <p>{t.noChatsFound}</p>
              </div>
            ) : (
              <div className="sidebar-threads-list">
                {conversations.map((thread) => {
                  const isActive = thread.id === activeThreadId;
                  const lastMsg = thread.messages[thread.messages.length - 1];
                  const messageCount = thread.messages.length;

                  return (
                    <div
                      key={thread.id}
                      className={`sidebar-thread-card ${isActive ? 'sidebar-thread-card--active' : ''}`}
                      onClick={() => onSelectThread(thread.id)}
                    >
                      <div className="thread-card-header">
                        <span className="thread-card-title">{thread.title || 'Support Session'}</span>
                        <button
                          className="thread-delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteThread(thread.id);
                          }}
                          title={t.deleteChat}
                          aria-label="Delete conversation"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {lastMsg && (
                        <p className="thread-preview-snippet">
                          {lastMsg.text.slice(0, 56)}
                          {lastMsg.text.length > 56 ? '...' : ''}
                        </p>
                      )}

                      <div className="thread-card-footer">
                        <span className="thread-time">
                          {new Date(thread.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="thread-count-badge">
                          {messageCount} {t.messagesCount}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {isCollapsed && (
        <div className="sidebar-collapsed-icons">
          <button
            className="collapsed-action-btn"
            onClick={onCreateNewChat}
            title={t.newChat}
          >
            <Plus size={18} />
          </button>
        </div>
      )}
    </aside>
  );
}
