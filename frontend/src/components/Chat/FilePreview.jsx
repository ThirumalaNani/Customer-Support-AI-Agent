import React from 'react';
import { X, FileText, Image as ImageIcon, File } from 'lucide-react';
import './FileUpload.css';

/**
 * Renders thumbnail chips for attached files with remove button
 */
export function FilePreviewList({ files = [], onRemoveFile }) {
  if (!files || files.length === 0) return null;

  return (
    <div className="file-preview-list animate-fade-in" aria-label="Attached files">
      {files.map((file) => (
        <div key={file.id} className="file-preview-chip glass-card">
          {file.isImage && file.previewUrl ? (
            <img src={file.previewUrl} alt={file.name} className="file-thumb-img" />
          ) : (
            <div className="file-thumb-icon">
              {file.isPdf ? <FileText size={15} color="#ef4444" /> : <File size={15} />}
            </div>
          )}

          <div className="file-chip-info">
            <span className="file-chip-name" title={file.name}>
              {file.name}
            </span>
            <span className="file-chip-size">{file.size}</span>
          </div>

          <button
            type="button"
            className="file-chip-remove-btn"
            onClick={() => onRemoveFile(file.id)}
            title="Remove file"
            aria-label={`Remove ${file.name}`}
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
