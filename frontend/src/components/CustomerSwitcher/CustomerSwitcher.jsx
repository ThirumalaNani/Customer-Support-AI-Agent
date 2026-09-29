import React, { useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, Check, UserPlus, Users, Database, ArrowRight } from 'lucide-react';
import { Badge } from '../UI/Badge';
import { Button } from '../UI/Button';
import './CustomerSwitcher.css';

export function CustomerSwitcher({
  customers,
  activeCustomer,
  activeCustomerId,
  onSelectCustomer,
  recalledCount = 0,
  showRecalledContext = false,
  onToggleRecalledContext,
  t,
}) {
  const [customIdInput, setCustomIdInput] = useState('');
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  const handleApplyCustom = (e) => {
    e?.preventDefault();
    if (!customIdInput.trim()) return;
    onSelectCustomer(customIdInput.trim());
    setCustomIdInput('');
    setIsCustomOpen(false);
  };

  const getInitials = (name) => {
    if (!name) return 'CU';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const isReturning = activeCustomer?.type === 'Returning Customer';

  return (
    <div className="customer-switcher-container glass-panel">
      <div className="switcher-meta-group">
        <div className="switcher-label-row">
          <span className="switcher-section-title">{t.activeSession || 'Active Customer Session'}</span>
          <span className="switcher-section-sub">Main Customer Switcher</span>
        </div>

        {/* Dropdown Menu for Main Customer Switcher */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="customer-trigger-card glass-card" aria-label="Main Customer Switcher">
              <div className="trigger-avatar">
                <span className="trigger-initials">{getInitials(activeCustomer?.name)}</span>
              </div>
              <div className="trigger-text-block">
                <div className="trigger-name-row">
                  <span className="trigger-name">{activeCustomer?.name || activeCustomerId}</span>
                  <Badge variant={isReturning ? 'accent' : 'neutral'} size="xs">
                    {isReturning ? t.returningCustomer : t.newCustomer}
                  </Badge>
                </div>
                <span className="trigger-role">
                  {activeCustomer?.role || 'Customer Profile'}{activeCustomer?.company ? ` • ${activeCustomer.company}` : ''} • <span className="trigger-id-mono">{activeCustomerId}</span>
                </span>
              </div>
              <ChevronDown className="trigger-chevron" size={16} />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content className="customer-dropdown-content glass-panel" align="start" sideOffset={6}>
              <div className="dropdown-header-label">
                <Users size={13} />
                <span>Select Active Customer Account</span>
              </div>

              {customers.map((cust) => {
                const isSelected = cust.id === activeCustomerId;
                return (
                  <DropdownMenu.Item
                    key={cust.id}
                    className={`customer-dropdown-item ${isSelected ? 'customer-dropdown-item--selected' : ''}`}
                    onSelect={() => onSelectCustomer(cust)}
                  >
                    <div className="dropdown-item-avatar">{getInitials(cust.name)}</div>
                    <div className="dropdown-item-info">
                      <div className="dropdown-item-title-row">
                        <span className="dropdown-item-name">{cust.name}</span>
                        <Badge variant={cust.type === 'Returning Customer' ? 'accent' : 'neutral'} size="xs">
                          {cust.type === 'Returning Customer' ? 'Returning' : 'New'}
                        </Badge>
                      </div>
                      <span className="dropdown-item-sub">
                        {cust.role} • {cust.id}
                      </span>
                      {cust.summary && <span className="dropdown-item-summary">{cust.summary}</span>}
                    </div>
                    {isSelected && <Check className="dropdown-item-check" size={16} />}
                  </DropdownMenu.Item>
                );
              })}

              <DropdownMenu.Separator className="customer-dropdown-separator" />

              <DropdownMenu.Item
                className="customer-dropdown-item customer-dropdown-custom-trigger"
                onSelect={(e) => {
                  e.preventDefault();
                  setIsCustomOpen((prev) => !prev);
                }}
              >
                <div className="dropdown-item-avatar dropdown-item-avatar--custom">
                  <UserPlus size={14} />
                </div>
                <div className="dropdown-item-info">
                  <span className="dropdown-item-name">Specify Custom Customer ID</span>
                  <span className="dropdown-item-sub">Switch to any arbitrary account identifier</span>
                </div>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {/* On-Demand Recalled Context Toggle Button */}
      {onToggleRecalledContext && (
        <div className="switcher-actions-right">
          <button
            type="button"
            className={`recalled-context-toggle-btn glass-card ${showRecalledContext ? 'recalled-context-toggle-btn--active' : ''}`}
            onClick={onToggleRecalledContext}
            title={showRecalledContext ? 'Hide Recalled Context' : 'View Recalled Context on demand'}
            aria-label="Toggle Recalled Context panel"
          >
            <div className="toggle-btn-icon-wrapper">
              <Database size={15} />
            </div>
            <div className="toggle-btn-text-group">
              <span className="toggle-btn-title">Recalled Context</span>
              <span className="toggle-btn-count">{recalledCount} {recalledCount === 1 ? 'record' : 'records'}</span>
            </div>
            <Badge variant={showRecalledContext ? 'accent' : 'neutral'} size="xs" className="toggle-btn-badge">
              {showRecalledContext ? 'Open' : 'View On-Demand'}
            </Badge>
          </button>
        </div>
      )}

      {/* On-Demand Custom ID Input Bar */}
      {isCustomOpen && (
        <form className="custom-id-bar glass-card animate-fade-in" onSubmit={handleApplyCustom}>
          <span className="custom-id-label">Custom Customer ID:</span>
          <input
            type="text"
            className="custom-id-input"
            value={customIdInput}
            onChange={(e) => setCustomIdInput(e.target.value)}
            placeholder="e.g. cust_enterprise_901"
            autoFocus
          />
          <Button variant="primary" size="sm" type="submit" icon={ArrowRight} iconPosition="right">
            Switch Context
          </Button>
          <Button variant="ghost" size="sm" type="button" onClick={() => setIsCustomOpen(false)}>
            Cancel
          </Button>
        </form>
      )}
    </div>
  );
}

