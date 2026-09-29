import React, { useRef } from 'react';
import { Paperclip, Image, FileText, Upload } from 'lucide-react';
import './FileUpload.css';

/**
 * File Attachment Button and Dropzone Handler
 * Supports: PNG, JPG, WEBP, SVG, PDF, TXT, LOG, JSON (Max 10MB)
 */
export function FileUpload({ onFilesSelected, disabled, t }) {
  const fileInputRef = useRef(null);

  const handleButtonClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    processSelectedFiles(files);
    e.target.value = ''; // Reset for re-selection
  };

  const processSelectedFiles = (files) => {
    files.forEach((file) => {
      // Validate size (< 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} exceeds the 10MB limit.`);
        return;
      }

      const isImg = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');

      const reader = new FileReader();

      if (isImg) {
        reader.onload = (event) => {
          onFilesSelected({
            id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            name: file.name,
            size: formatFileSize(file.size),
            type: file.type,
            isImage: true,
            previewUrl: event.target.result,
            summary: `Image attachment: ${file.name} (${formatFileSize(file.size)})`,
          });
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = (event) => {
          onFilesSelected({
            id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            name: file.name,
            size: formatFileSize(file.size),
            type: file.type,
            isImage: false,
            isPdf: isPdf,
            previewUrl: null,
            summary: `Document attachment: ${file.name} (${formatFileSize(file.size)})`,
            contentSnippet: isPdf
              ? `[PDF Document: ${file.name}]`
              : typeof event.target?.result === 'string'
              ? event.target.result.slice(0, 500)
              : '',
          });
        };
        if (isPdf) {
          reader.readAsArrayBuffer(file);
        } else {
          reader.readAsText(file);
        }
      }
    });
  };

  return (
    <div className="file-upload-wrapper">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.txt,.log,.json"
        className="file-input-hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />
      <button
        type="button"
        className="file-attach-btn"
        onClick={handleButtonClick}
        disabled={disabled}
        title={t.attachFiles || 'Attach image or PDF document'}
        aria-label="Attach file"
      >
        <Paperclip size={16} />
      </button>
    </div>
  );
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
