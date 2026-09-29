import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Search,
  Tag,
  ShieldCheck,
  Sparkles,
  Inbox,
  Clock,
  CheckCircle2,
  Trash2,
  Filter,
} from 'lucide-react';
import { Badge } from '../UI/Badge';

export function MemoryTimeline({
  memories = [],
  activeCustomerId,
  activeCustomer,
  onDeleteMemory,
  t,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = useMemo(() => {
    const set = new Set();
    memories.forEach((m) => {
      if (m.category) set.add(m.category);
    });
    return Array.from(set);
  }, [memories]);

  const filteredMemories = useMemo(() => {
    return memories.filter((mem) => {
      const text = (mem.text || (typeof mem === 'string' ? mem : '')).toLowerCase();
      const cat = (mem.category || '').toLowerCase();
      const matchesSearch = text.includes(searchQuery.toLowerCase()) || cat.includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || mem.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [memories, searchQuery, selectedCategory]);

  return (
    <div className="memory-timeline-container glass-card">
      <div className="memory-timeline-header">
        <div className="timeline-title-group">
          <Clock size={18} className="timeline-header-icon" />
          <div>
            <h3 className="timeline-title">{t.memoryTimelineTitle || 'Chronological Memory Timeline'}</h3>
            <span className="timeline-sub">Partition: {activeCustomerId}</span>
          </div>
        </div>

        {/* Search & Category Filter */}
        <div className="timeline-controls">
          <div className="timeline-search-box">
            <Search size={13} className="timeline-search-icon" />
            <input
              type="text"
              placeholder={t.searchMemories || 'Search memories...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="timeline-search-input"
            />
          </div>

          {categories.length > 0 && (
            <select
              className="timeline-category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="timeline-stream-scroll">
        {filteredMemories.length === 0 ? (
          <div className="timeline-empty-state">
            <Inbox size={26} strokeWidth={1.8} className="timeline-empty-icon" />
            <p className="timeline-empty-text">{t.noMemoriesRecorded || 'No prior memories found for this partition.'}</p>
          </div>
        ) : (
          <div className="timeline-events-list">
            {filteredMemories.map((item, index) => {
              const isObj = typeof item === 'object' && item !== null;
              const text = isObj ? item.text : item;
              const date = isObj ? item.date : `Record #${index + 1}`;
              const category = isObj ? item.category : 'General History';
              const confidence = isObj && item.confidence ? Math.round(item.confidence * 100) : 95;
              const source = isObj ? item.source : 'Live Session';

              return (
                <div key={item.id || index} className="timeline-event-card glass-card animate-fade-in">
                  <div className="timeline-marker">
                    <div className="marker-dot" />
                    {index < filteredMemories.length - 1 && <div className="marker-line" />}
                  </div>

                  <div className="timeline-event-content">
                    <div className="event-meta-row">
                      <div className="event-date-group">
                        <Calendar size={12} />
                        <span>{date}</span>
                      </div>
                      <Badge variant="neutral" size="xs">
                        {category}
                      </Badge>
                      <span className="event-confidence-badge">
                        <CheckCircle2 size={11} className="confidence-icon" /> {confidence}% confidence
                      </span>
                      {source && <span className="event-source-text">• {source}</span>}
                    </div>

                    <p className="event-text">{text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
