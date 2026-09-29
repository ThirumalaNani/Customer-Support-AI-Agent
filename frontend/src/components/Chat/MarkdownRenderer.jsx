import React, { useState } from 'react';
import { Copy, Check, Terminal, ExternalLink } from 'lucide-react';
import './MarkdownRenderer.css';

/**
 * Custom High-Performance Markdown Renderer
 * Supports: Fenced Code Blocks with Copy, Inline Code, Headers, Lists, Tables, Blockquotes, Bold, Italic, Links.
 */
export function MarkdownRenderer({ content = '', isStreaming = false }) {
  if (!content) return null;

  // Split into tokens: code blocks vs text blocks
  const tokens = parseMarkdownTokens(content);

  return (
    <div className={`markdown-body ${isStreaming ? 'markdown-body--streaming' : ''}`}>
      {tokens.map((token, index) => {
        if (token.type === 'code_block') {
          return (
            <CodeBlock
              key={index}
              language={token.language}
              code={token.code}
            />
          );
        } else if (token.type === 'table') {
          return <TableBlock key={index} rows={token.rows} />;
        } else if (token.type === 'blockquote') {
          return (
            <blockquote key={index} className="md-blockquote">
              <MarkdownInline text={token.text} />
            </blockquote>
          );
        } else if (token.type === 'heading') {
          const Tag = `h${Math.min(token.level + 1, 6)}`;
          return (
            <Tag key={index} className={`md-heading md-heading-${token.level}`}>
              <MarkdownInline text={token.text} />
            </Tag>
          );
        } else if (token.type === 'list') {
          return (
            <ul key={index} className="md-list">
              {token.items.map((item, itemIdx) => (
                <li key={itemIdx} className="md-list-item">
                  <span className="md-bullet">•</span>
                  <span>
                    <MarkdownInline text={item} />
                  </span>
                </li>
              ))}
            </ul>
          );
        } else if (token.type === 'ordered_list') {
          return (
            <ol key={index} className="md-ordered-list">
              {token.items.map((item, itemIdx) => (
                <li key={itemIdx} className="md-ordered-item">
                  <span className="md-order-num">{itemIdx + 1}.</span>
                  <span>
                    <MarkdownInline text={item} />
                  </span>
                </li>
              ))}
            </ol>
          );
        } else {
          return (
            <p key={index} className="md-paragraph">
              <MarkdownInline text={token.text} />
            </p>
          );
        }
      })}
    </div>
  );
}

/**
 * Code Block with Header and Copy Button
 */
function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="md-code-block glass-card">
      <div className="md-code-header">
        <div className="md-code-lang">
          <Terminal size={13} className="md-terminal-icon" />
          <span>{language || 'code'}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="md-code-copy-btn"
          title="Copy code"
          aria-label="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check size={12} className="text-success" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="md-code-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * Table Component
 */
function TableBlock({ rows }) {
  if (!rows || rows.length === 0) return null;
  const header = rows[0];
  const bodyRows = rows.slice(1);

  return (
    <div className="md-table-wrapper">
      <table className="md-table">
        <thead>
          <tr>
            {header.map((col, idx) => (
              <th key={idx}>
                <MarkdownInline text={col} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((row, rIdx) => (
            <tr key={rIdx}>
              {row.map((cell, cIdx) => (
                <td key={cIdx}>
                  <MarkdownInline text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Inline Markdown Parser for bold, italics, inline code, and links
 */
function MarkdownInline({ text = '' }) {
  if (!text) return null;

  // Split by inline code first
  const parts = [];
  const codeRegex = /`([^`]+)`/g;
  let lastIndex = 0;
  let match;

  while ((match = codeRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.substring(lastIndex, match.index) });
    }
    parts.push({ type: 'inline_code', value: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.substring(lastIndex) });
  }

  return (
    <>
      {parts.map((part, pIdx) => {
        if (part.type === 'inline_code') {
          return (
            <code key={pIdx} className="md-inline-code">
              {part.value}
            </code>
          );
        }

        // Format bold, italic, links in text segment
        return <FormattedText key={pIdx} text={part.value} />;
      })}
    </>
  );
}

function FormattedText({ text }) {
  // Simple parser for bold **text**, italic *text*, links [label](url)
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  const segments = text.split(regex);

  return (
    <>
      {segments.map((seg, idx) => {
        if (seg.startsWith('**') && seg.endsWith('**')) {
          return <strong key={idx}>{seg.slice(2, -2)}</strong>;
        } else if (seg.startsWith('*') && seg.endsWith('*')) {
          return <em key={idx}>{seg.slice(1, -1)}</em>;
        } else if (seg.startsWith('[') && seg.includes('](') && seg.endsWith(')')) {
          const match = seg.match(/\[([^\]]+)\]\(([^)]+)\)/);
          if (match) {
            return (
              <a
                key={idx}
                href={match[2]}
                target="_blank"
                rel="noopener noreferrer"
                className="md-link"
              >
                {match[1]} <ExternalLink size={10} className="md-link-icon" />
              </a>
            );
          }
        }
        return <span key={idx}>{seg}</span>;
      })}
    </>
  );
}

/**
 * Top-level block parser
 */
function parseMarkdownTokens(rawText) {
  const tokens = [];
  const lines = rawText.split(/\r?\n/);
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced Code block
    if (line.trim().startsWith('```')) {
      const language = line.trim().replace(/^```/, '').trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      tokens.push({
        type: 'code_block',
        language: language || 'code',
        code: codeLines.join('\n'),
      });
      continue;
    }

    // Headings
    if (line.startsWith('#')) {
      const match = line.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        tokens.push({
          type: 'heading',
          level: match[1].length,
          text: match[2],
        });
        i++;
        continue;
      }
    }

    // Blockquote
    if (line.startsWith('>')) {
      const bqText = line.replace(/^>\s*/, '');
      tokens.push({
        type: 'blockquote',
        text: bqText,
      });
      i++;
      continue;
    }

    // Unordered List
    if (/^\s*[-*]\s+/.test(line)) {
      const listItems = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      tokens.push({
        type: 'list',
        items: listItems,
      });
      continue;
    }

    // Ordered List
    if (/^\s*\d+\.\s+/.test(line)) {
      const orderedItems = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        orderedItems.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      tokens.push({
        type: 'ordered_list',
        items: orderedItems,
      });
      continue;
    }

    // Tables: e.g. | col1 | col2 |
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableRows = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        const rowLine = lines[i].trim();
        // Skip separator line |---|---|
        if (!/^\|(\s*:?-+:?\s*\|)+$/.test(rowLine)) {
          const cells = rowLine
            .slice(1, -1)
            .split('|')
            .map((c) => c.trim());
          tableRows.push(cells);
        }
        i++;
      }
      if (tableRows.length > 0) {
        tokens.push({
          type: 'table',
          rows: tableRows,
        });
        continue;
      }
    }

    // Regular paragraphs (group non-empty lines)
    if (line.trim().length > 0) {
      tokens.push({
        type: 'paragraph',
        text: line,
      });
    }

    i++;
  }

  return tokens;
}
