import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Sparkles,
  Layers,
  ArrowRight,
  Shield,
  Database,
  ShoppingCart,
  HardDrive,
  Cpu,
} from 'lucide-react';
import { KNOWLEDGE_BASE_ARTICLES } from '../../data/knowledgeBaseData';
import { KnowledgeBaseCard } from './KnowledgeBaseCard';
import { Button } from '../UI/Button';
import { Badge } from '../UI/Badge';
import './KnowledgeBase.css';

/**
 * Knowledge Base & Searchable FAQs View with AI Fallback
 */
export function KnowledgeBaseView({ onAskAi, t }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const CATEGORIES = [
    { id: 'all', label: t.allCategories || 'All Topics', icon: Layers },
    { id: 'catInfrastructure', label: t.catInfrastructure || 'Infrastructure & Gateways', icon: Cpu },
    { id: 'catSecurity', label: t.catSecurity || 'Security & SSO', icon: Shield },
    { id: 'catEcommerce', label: t.catEcommerce || 'E-Commerce & Webhooks', icon: ShoppingCart },
    { id: 'catDatabase', label: t.catDatabase || 'Databases & Caching', icon: Database },
    { id: 'catMemory', label: t.catMemory || 'Memory & Privacy', icon: HardDrive },
  ];

  // Filter articles based on search query and category
  const filteredArticles = useMemo(() => {
    return KNOWLEDGE_BASE_ARTICLES.filter((article) => {
      const matchCategory =
        selectedCategory === 'all' || article.category === selectedCategory;

      if (!searchQuery.trim()) return matchCategory;

      const q = searchQuery.toLowerCase();
      const matchText =
        article.title.toLowerCase().includes(q) ||
        article.summary.toLowerCase().includes(q) ||
        article.content.toLowerCase().includes(q) ||
        article.tags.some((tag) => tag.toLowerCase().includes(q));

      return matchCategory && matchText;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="kb-view glass-panel animate-fade-in">
      {/* KB Header */}
      <div className="kb-header">
        <div className="kb-title-group">
          <div className="kb-header-icon-box">
            <BookOpen size={24} strokeWidth={2.2} />
          </div>
          <div>
            <h2 className="kb-title">{t.kbTitle || 'Enterprise Knowledge Base & FAQs'}</h2>
            <p className="kb-subtitle">
              {t.kbSubtitle || 'Instant technical answers, architecture patterns, and self-service troubleshooting'}
            </p>
          </div>
        </div>

        <div className="kb-articles-count-badge">
          <Badge variant="accent" size="sm">
            {filteredArticles.length} {filteredArticles.length === 1 ? 'Article' : 'Articles'}
          </Badge>
        </div>
      </div>

      {/* Search Bar & AI Fallback Banner */}
      <div className="kb-search-container">
        <div className="kb-search-box glass-card">
          <Search size={18} className="kb-search-icon" />
          <input
            type="text"
            className="kb-search-input"
            placeholder={t.kbSearchPlaceholder || 'Search FAQ articles, configurations, error codes...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="kb-search-clear"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="kb-categories-nav">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              className={`kb-category-btn ${isActive ? 'kb-category-btn--active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              <Icon size={14} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Articles Grid or Empty Fallback */}
      <div className="kb-articles-list">
        {filteredArticles.length > 0 ? (
          filteredArticles.map((article) => (
            <KnowledgeBaseCard
              key={article.id}
              article={article}
              onAskAi={onAskAi}
              t={t}
            />
          ))
        ) : (
          <div className="kb-empty-state glass-card animate-fade-in">
            <div className="kb-empty-icon-box">
              <Sparkles size={32} />
            </div>
            <h3 className="kb-empty-title">{t.kbNoMatches || 'No FAQ articles match your search criteria.'}</h3>
            <p className="kb-empty-desc">
              {t.askAiFallbackDesc || "Couldn't find the answer in the knowledge base? Consult the context-aware support assistant directly."}
            </p>
            <Button
              variant="primary"
              size="md"
              icon={ArrowRight}
              iconPosition="right"
              onClick={() => onAskAi(searchQuery || 'How do I resolve my support inquiry?')}
            >
              {t.askAiFallback || 'Ask AI Support Assistant'}
            </Button>
          </div>
        )}
      </div>

      {/* Global AI Fallback Banner at Bottom */}
      <div className="kb-ai-fallback-banner glass-card">
        <div className="kb-fallback-text-group">
          <div className="kb-fallback-icon-pulse">
            <Sparkles size={20} />
          </div>
          <div>
            <strong className="kb-fallback-headline">
              {t.askAiFallback || 'Consult Context-Aware AI Assistant'}
            </strong>
            <p className="kb-fallback-sub">
              Our AI remembers your past environment parameters, proxy timeouts, and account SLA level to tailor responses.
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={ArrowRight}
          iconPosition="right"
          onClick={() => onAskAi('I need assistance reviewing our current system architecture and configuration.')}
        >
          {t.tabChat || 'Open Chat Workspace'}
        </Button>
      </div>
    </div>
  );
}
