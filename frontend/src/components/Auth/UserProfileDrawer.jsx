import React from 'react';
import { User, Shield, Mail, Building, Globe, LogOut, Clock, Key } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Badge } from '../UI/Badge';
import './Auth.css';

/**
 * User Profile Dropdown Menu in the Header showing authenticated state and logout
 */
export function UserProfileDropdown({
  currentUser,
  sessionRemainingTime,
  onOpenLoginModal,
  onLogout,
  t,
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

  const minutesRemaining = Math.floor(sessionRemainingTime / 60);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="user-profile-header-trigger glass-panel"
          aria-label="User profile and session"
        >
          <div className="user-profile-avatar-mini">
            {getInitials(currentUser?.name || currentUser?.id)}
          </div>
          <div className="user-profile-header-meta">
            <span className="user-profile-header-name">
              {currentUser?.name || currentUser?.id || 'Alex Chen'}
            </span>
            <span className="user-profile-header-role">
              {currentUser?.role || 'Customer Lead'}
            </span>
          </div>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="user-profile-dropdown-menu glass-panel animate-fade-in"
          align="end"
          sideOffset={8}
        >
          {/* Top Profile Card */}
          <div className="dropdown-profile-header">
            <div className="dropdown-profile-avatar">
              {getInitials(currentUser?.name || currentUser?.id)}
            </div>
            <div className="dropdown-profile-titles">
              <strong className="dropdown-profile-name">{currentUser?.name}</strong>
              <span className="dropdown-profile-email">
                {currentUser?.email || `${currentUser?.id}@example.com`}
              </span>
              <div className="dropdown-badges-row">
                <Badge variant="accent" size="xs">
                  {currentUser?.tier || 'Enterprise SLA'}
                </Badge>
                <Badge variant="primary" size="xs">
                  {currentUser?.authRole === 'admin' ? 'Support Admin' : 'Customer Account'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="dropdown-divider" />

          {/* Account Meta Rows */}
          <div className="dropdown-meta-list">
            <div className="dropdown-meta-row">
              <span className="dropdown-meta-label">{t.partitionKey || 'Customer ID'}:</span>
              <code className="dropdown-meta-code">{currentUser?.id}</code>
            </div>

            <div className="dropdown-meta-row">
              <span className="dropdown-meta-label">{t.company || 'Company'}:</span>
              <span className="dropdown-meta-val">{currentUser?.company || 'Enterprise'}</span>
            </div>

            <div className="dropdown-meta-row">
              <span className="dropdown-meta-label">{t.sessionExpiresIn || 'Session Inactivity'}:</span>
              <span className="dropdown-meta-val text-cyan">
                <Clock size={11} style={{ display: 'inline', marginRight: 3 }} />
                {minutesRemaining} min remaining
              </span>
            </div>
          </div>

          <div className="dropdown-divider" />

          {/* Action Items */}
          <DropdownMenu.Item
            className="dropdown-menu-action"
            onSelect={onOpenLoginModal}
          >
            <Key size={14} />
            <span>Switch Account / Re-authenticate</span>
          </DropdownMenu.Item>

          <DropdownMenu.Item
            className="dropdown-menu-action dropdown-menu-action--danger"
            onSelect={onLogout}
          >
            <LogOut size={14} />
            <span>{t.logoutButton || 'Sign Out'}</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
