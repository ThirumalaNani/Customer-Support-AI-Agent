import React, { useState } from 'react';
import * as Collapsible from '@radix-ui/react-collapsible';
import { Clock, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { Badge } from '../UI/Badge';

export function MemoryCard({ recordText, index }) {
  const [isOpen, setIsOpen] = useState(false);

  // Extract leading timestamp if present (e.g. "2026-08-10: ...")
  const dateMatch = recordText.match(/^(\d{4}-\d{2}-\d{2}):?\s*(.*)$/s);
  const dateStr = dateMatch ? dateMatch[1] : null;
  const contentStr = dateMatch ? dateMatch[2] : recordText;

  const isLong = contentStr.length > 130;
  const previewText = isLong && !isOpen ? `${contentStr.slice(0, 130)}...` : contentStr;

  return (
    <Collapsible.Root
      open={isOpen}
      onOpenChange={setIsOpen}
      className={`memory-card ${isOpen ? 'memory-card--open' : ''}`}
    >
      <div className="memory-card-header">
        <div className="memory-card-meta">
          <Badge variant="accent" size="xs" icon={FileText}>
            Record #{index + 1}
          </Badge>
          {dateStr && (
            <span className="memory-date-tag">
              <Clock size={11} />
              <span>{dateStr}</span>
            </span>
          )}
        </div>

        {isLong && (
          <Collapsible.Trigger asChild>
            <button className="memory-expand-btn" aria-label={isOpen ? 'Collapse memory' : 'Expand memory'}>
              <span className="expand-text">{isOpen ? 'Less' : 'More'}</span>
              <ChevronDown className="expand-chevron" size={13} />
            </button>
          </Collapsible.Trigger>
        )}
      </div>

      <p className="memory-card-text">{isOpen ? contentStr : previewText}</p>
    </Collapsible.Root>
  );
}
