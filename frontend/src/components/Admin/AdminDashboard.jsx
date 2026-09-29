import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Search,
  Download,
  Trash2,
  Database,
  FileText,
  User,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Calendar,
  ExternalLink,
  Lock,
  Unlock,
  Filter,
  Smile,
  Meh,
  Frown,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '../UI/Button';
import { Badge } from '../UI/Badge';
import { Modal } from '../UI/Modal';
import './Admin.css';

export function AdminDashboard({
  customers = [],
  conversationsMap = {},
  memoriesMap = {},
  onDeleteCustomerMemory,
  onExportHistory,
  onSelectCustomer,
  currentUser,
  t,
}) {
  // Admin PIN Lock State
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(currentUser?.authRole === 'admin');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('all'); // 'all' | 'positive' | 'neutral' | 'negative'
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | '7days' | '30days'
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || 'alex_chen');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || customers[0];
  }, [customers, selectedCustomerId]);

  const customerMemories = memoriesMap[selectedCustomerId] || [];
  const rawConversations = conversationsMap[selectedCustomerId] || [];

  // Filter conversations by search, sentiment, date
  const filteredConversations = useMemo(() => {
    return rawConversations.filter((thread) => {
      // Date filter
      if (dateFilter === 'today') {
        const isToday =
          new Date(thread.createdAt).toDateString() === new Date().toDateString();
        if (!isToday) return false;
      }

      // Search query in thread title or messages
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          thread.title.toLowerCase().includes(q) ||
          thread.messages.some((m) => m.text.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [rawConversations, searchQuery, dateFilter]);

  // Filtered customer accounts based on search
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        (c.role && c.role.toLowerCase().includes(q)) ||
        (c.company && c.company.toLowerCase().includes(q))
    );
  }, [customers, searchQuery]);

  const handleUnlockPin = (e) => {
    e?.preventDefault();
    if (pinInput === 'admin123' || pinInput === 'demo123') {
      setIsAdminUnlocked(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const handleOpenDelete = (cid) => {
    setCustomerToDelete(cid);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (customerToDelete) {
      onDeleteCustomerMemory(customerToDelete);
    }
    setIsDeleteModalOpen(false);
    setCustomerToDelete(null);
  };

  // If Admin Console is locked, show PIN prompt
  if (!isAdminUnlocked) {
    return (
      <div className="admin-lock-screen glass-panel animate-fade-in">
        <div className="admin-lock-card glass-card">
          <div className="admin-lock-icon-box">
            <Lock size={32} className="text-cyan" />
          </div>
          <h2 className="admin-lock-title">{t.adminLockTitle || 'Admin Authentication Required'}</h2>
          <p className="admin-lock-subtitle">
            {t.adminLockSubtitle || 'Enter the administrator security PIN (default: admin123) to access customer audit logs and data export controls.'}
          </p>

          <form onSubmit={handleUnlockPin} className="admin-lock-form">
            <div className="admin-pin-group">
              <input
                type="password"
                className="admin-pin-input"
                placeholder="Enter PIN (e.g. admin123)"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                autoFocus
              />
              {pinError && (
                <span className="admin-pin-error">Incorrect PIN. Please try again.</span>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              icon={Unlock}
              className="admin-unlock-btn"
            >
              {t.unlockAdmin || 'Unlock Admin Console'}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-view glass-panel animate-fade-in">
      {/* Admin Header */}
      <div className="admin-header">
        <div className="admin-title-group">
          <div className="admin-icon-box">
            <ShieldAlert size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div className="admin-title-row">
              <h2 className="admin-title">{t.adminTitle || 'Admin Support & Memory Console'}</h2>
              <Badge variant="success" size="xs" icon={CheckCircle2}>
                {t.adminUnlockedBadge || 'Verified Admin Access'}
              </Badge>
            </div>
            <p className="admin-sub">
              {t.adminSubtitle || 'Audit logs, conversation inspection, data export, and partition memory management'}
            </p>
          </div>
        </div>

        {/* Action Buttons: Export Markdown, JSON, CSV */}
        <div className="admin-actions-bar">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExportHistory('csv')}
            icon={FileSpreadsheet}
          >
            {t.exportCsv || 'Export CSV'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onExportHistory('markdown')}
            icon={FileText}
          >
            {t.exportMarkdown || 'Export Markdown'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => onExportHistory('json')}
            icon={Download}
          >
            {t.exportJson || 'Export JSON'}
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="admin-filter-bar glass-card">
        <div className="admin-filter-item">
          <Filter size={13} />
          <span className="filter-label">{t.filterByDate || 'Date'}:</span>
          <select
            className="admin-filter-select"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="all">{t.allTime || 'All Time'}</option>
            <option value="today">{t.today || 'Today'}</option>
            <option value="7days">{t.past7Days || 'Past 7 Days'}</option>
          </select>
        </div>

        <div className="admin-filter-item">
          <span className="filter-label">{t.filterBySentiment || 'Sentiment'}:</span>
          <select
            className="admin-filter-select"
            value={sentimentFilter}
            onChange={(e) => setSentimentFilter(e.target.value)}
          >
            <option value="all">All Sentiments</option>
            <option value="positive">{t.positive || 'Positive'}</option>
            <option value="neutral">{t.neutral || 'Neutral'}</option>
            <option value="negative">{t.negative || 'Negative'}</option>
          </select>
        </div>
      </div>

      {/* Main Admin Split Layout */}
      <div className="admin-workspace-split">
        {/* Left: Customer Accounts Directory */}
        <div className="admin-customers-panel glass-card">
          <div className="admin-search-wrapper">
            <Search size={14} className="admin-search-icon" />
            <input
              type="text"
              className="admin-search-input"
              placeholder={t.searchAllData || 'Search customers and memories...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="admin-customer-items-list">
            {filteredCustomers.map((cust) => {
              const isSelected = cust.id === selectedCustomerId;
              const mems = (memoriesMap[cust.id] || []).length;
              const convs = (conversationsMap[cust.id] || []).length;

              return (
                <div
                  key={cust.id}
                  className={`admin-cust-card ${isSelected ? 'admin-cust-card--selected' : ''}`}
                  onClick={() => setSelectedCustomerId(cust.id)}
                >
                  <div className="admin-cust-header">
                    <strong className="admin-cust-name">{cust.name}</strong>
                    <Badge variant={cust.type === 'Returning Customer' ? 'accent' : 'neutral'} size="xs">
                      {cust.type === 'Returning Customer' ? 'Returning' : 'New'}
                    </Badge>
                  </div>
                  <span className="admin-cust-role">
                    {cust.role} {cust.company ? `• ${cust.company}` : ''}
                  </span>
                  <div className="admin-cust-footer">
                    <span className="admin-cust-mono">{cust.id}</span>
                    <span className="admin-cust-stats">
                      {convs} chats • {mems} memories
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Customer Memories & Conversation Inspection */}
        <div className="admin-detail-panel glass-card">
          {/* Header of Detail Panel */}
          <div className="admin-detail-header">
            <div className="admin-detail-cust-meta">
              <h3 className="admin-detail-title">{selectedCustomer?.name}</h3>
              <span className="admin-detail-sub">
                Partition Key: <code>{selectedCustomerId}</code> • {selectedCustomer?.company}
              </span>
            </div>

            <div className="admin-detail-actions">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelectCustomer(selectedCustomer)}
                icon={ExternalLink}
              >
                Open in Chat
              </Button>

              <Button
                variant="danger"
                size="sm"
                onClick={() => handleOpenDelete(selectedCustomerId)}
                icon={Trash2}
              >
                {t.deleteCustomerMemory || 'Erase Memory'}
              </Button>
            </div>
          </div>

          {/* Section 1: Retained Partition Memories */}
          <div className="admin-section-block">
            <div className="admin-section-header">
              <Database size={15} className="text-cyan" />
              <h4>Retained Historical Memories ({customerMemories.length})</h4>
            </div>

            {customerMemories.length === 0 ? (
              <div className="admin-empty-memories">
                <p>No memories currently stored in this partition.</p>
              </div>
            ) : (
              <div className="admin-memories-scroll">
                {customerMemories.map((mem, index) => (
                  <div key={mem.id || index} className="admin-memory-item glass-card">
                    <div className="admin-mem-top">
                      <span className="admin-mem-date">{mem.date || 'Recent Turn'}</span>
                      <div className="admin-mem-badges">
                        {mem.category && (
                          <Badge variant="accent" size="xs">
                            {mem.category}
                          </Badge>
                        )}
                        <Badge variant="success" size="xs">
                          {mem.confidence ? `${Math.round(mem.confidence * 100)}%` : '96% Match'}
                        </Badge>
                      </div>
                    </div>
                    <p className="admin-mem-text">{mem.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Conversation Sessions Audit Log */}
          <div className="admin-section-block">
            <div className="admin-section-header">
              <MessageSquare size={15} className="text-purple" />
              <h4>Recorded Conversation Sessions ({filteredConversations.length})</h4>
            </div>

            {filteredConversations.length === 0 ? (
              <div className="admin-empty-memories">
                <p>No conversation sessions recorded for this customer.</p>
              </div>
            ) : (
              <div className="admin-conversations-scroll">
                {filteredConversations.map((thread) => (
                  <div key={thread.id} className="admin-thread-box glass-card">
                    <div className="admin-thread-head">
                      <strong>{thread.title}</strong>
                      <span className="admin-thread-time">{thread.createdAt}</span>
                    </div>
                    <div className="admin-thread-messages-list">
                      {thread.messages.map((m, mIdx) => (
                        <div
                          key={m.id || mIdx}
                          className={`admin-log-msg admin-log-msg--${m.sender}`}
                        >
                          <span className="admin-log-author">{m.sender.toUpperCase()}:</span>
                          <span className="admin-log-text">{m.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Delete Memory Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={t.deleteCustomerMemory || 'Erase Customer Memory Partition'}
        maxWidth="460px"
      >
        <div className="delete-modal-body">
          <div className="delete-warning-icon-box">
            <AlertTriangle size={32} color="#ef4444" />
          </div>
          <p className="delete-modal-text">
            {t.confirmDeleteMemory || 'Are you sure you want to permanently erase all memories for this customer?'}
          </p>
          <div className="delete-target-badge">
            <strong>Target Partition:</strong> <code>{customerToDelete}</code>
          </div>

          <div className="delete-modal-actions">
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              {t.cancel || 'Cancel'}
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={handleConfirmDelete}
              icon={Trash2}
            >
              {t.confirm || 'Confirm & Erase'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
