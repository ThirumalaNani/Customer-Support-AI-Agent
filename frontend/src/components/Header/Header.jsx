import React from 'react';
import {
  Bot,
  Cpu,
  Database,
  Sun,
  Moon,
  Globe,
  MessageSquare,
  Network,
  UserCheck,
  BarChart3,
  ShieldAlert,
  ChevronDown,
  BookOpen,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Badge } from '../UI/Badge';
import { UserProfileDropdown } from '../Auth/UserProfileDrawer';
import { LANGUAGE_OPTIONS } from '../../i18n/translations';
import './Header.css';

export function Header({
  systemStatus,
  theme,
  onToggleTheme,
  language,
  onChangeLanguage,
  activeView,
  onSelectView,
  currentUser,
  sessionRemainingTime,
  onOpenLoginModal,
  onLogout,
  t,
}) {
  const agentName = systemStatus?.agent_name || t.agentName;
  const llmProvider = (systemStatus?.llm_provider || 'Groq').toUpperCase();
  const llmModel = systemStatus?.llm_model || 'llama-3.1-8b-instant';
  const historyProvider = (systemStatus?.history_provider || 'Hindsight').toUpperCase();
  const isOperational = (systemStatus?.status || 'operational') === 'operational';

  const currentLangObj = LANGUAGE_OPTIONS.find((l) => l.code === language) || LANGUAGE_OPTIONS[0];

  const NAV_ITEMS = [
    { id: 'chat', label: t.tabChat, icon: MessageSquare },
    { id: 'memory', label: t.tabMemory, icon: Network },
    { id: 'customer', label: t.tabCustomer, icon: UserCheck },
    { id: 'knowledge', label: t.tabKnowledge || 'Knowledge Base', icon: BookOpen },
    { id: 'analytics', label: t.tabAnalytics, icon: BarChart3 },
    { id: 'admin', label: t.tabAdmin, icon: ShieldAlert },
  ];

  return (
    <header className="app-header glass-panel">
      {/* Brand & Logo */}
      <div className="header-left">
        <div className="header-brand-icon">
          <Bot size={22} strokeWidth={2.4} />
        </div>
        <div className="header-brand-info">
          <div className="header-title-row">
            <h1 className="header-title">{agentName}</h1>
          </div>
          <p className="header-subtitle">{t.tagline}</p>
        </div>
      </div>

      {/* Main View Navigation Tabs */}
      <nav className="header-nav-tabs" aria-label="Main Navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`header-nav-btn ${isActive ? 'header-nav-btn--active' : ''}`}
            >
              <Icon size={16} strokeWidth={isActive ? 2.4 : 1.8} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right Actions & Telemetry */}
      <div className="header-right">
        {/* Multilingual Selector */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="header-icon-btn header-lang-trigger" aria-label="Select Language">
              <Globe size={16} />
              <span className="lang-code-text">{currentLangObj.flag} {currentLangObj.nativeName}</span>
              <ChevronDown size={13} className="lang-chevron" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content className="header-dropdown-content glass-panel" align="end" sideOffset={6}>
              <div className="header-dropdown-title">
                <Globe size={13} />
                <span>{t.switchLanguage || 'Select Language'}</span>
              </div>
              {LANGUAGE_OPTIONS.map((opt) => (
                <DropdownMenu.Item
                  key={opt.code}
                  className={`header-dropdown-item ${language === opt.code ? 'header-dropdown-item--selected' : ''}`}
                  onSelect={() => onChangeLanguage(opt.code)}
                >
                  <span className="lang-flag">{opt.flag}</span>
                  <div className="lang-text-group">
                    <span className="lang-native-name">{opt.nativeName}</span>
                    <span className="lang-label-sub">{opt.label}</span>
                  </div>
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        {/* Theme Toggle (Dark / Light) */}
        <button
          className="header-icon-btn"
          onClick={onToggleTheme}
          title={theme === 'dark' ? t.themeLight : t.themeDark}
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={17} className="theme-sun-icon" /> : <Moon size={17} className="theme-moon-icon" />}
        </button>

        {/* User Session & Profile Dropdown */}
        <UserProfileDropdown
          currentUser={currentUser}
          sessionRemainingTime={sessionRemainingTime}
          onOpenLoginModal={onOpenLoginModal}
          onLogout={onLogout}
          t={t}
        />
      </div>
    </header>
  );
}
