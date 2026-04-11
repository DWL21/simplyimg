import { useCallback, useRef } from 'react';
import { formatSelectedCount, useI18n } from '../i18n/messages';
import { acceptedImageInput } from '../lib/formatUtils';
import { getToolDisplayLabel } from '../lib/toolConstants';
import { useImageStore } from '../store/imageStore';
import Brand from './Brand';
import type { ToolName } from '../types/image';

interface Props {
  tool: ToolName;
  onConfirm: () => void;
  onBack: () => void;
}

export default function UploadZone({ tool, onConfirm, onBack }: Props) {
  const { locale, messages } = useI18n();
  const files = useImageStore((s) => s.files);
  const error = useImageStore((s) => s.error);
  const uploadErrors = useImageStore((s) => s.uploadErrors);
  const addFiles = useImageStore((s) => s.addFiles);
  const removeFile = useImageStore((s) => s.removeFile);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (incoming: File[]) => {
      if (incoming.length > 0) addFiles(incoming);
    },
    [addFiles],
  );

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length > 0) handleFiles(dropped);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length > 0) handleFiles(picked);
    e.target.value = '';
  }

  const hasFiles = files.length > 0;

  return (
    <div className="upload-page" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
      <input
        ref={inputRef}
        id="upload-input"
        type="file"
        multiple
        accept={acceptedImageInput}
        onChange={handleChange}
        style={{ display: 'none' }}
      />

      <header className="upload-header">
        <button className="back-btn" onClick={onBack}>{messages.imageUpload.back}</button>
        <Brand />
        <span className="tool-badge">{getToolDisplayLabel(tool, locale)}</span>
      </header>

      {!hasFiles ? (
        <label className="upload-dropzone" htmlFor="upload-input">
          <div className="upload-inner">
            <div className="upload-icon">
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.4"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <strong className="upload-heading">{messages.imageUpload.dropTitle}</strong>
            <span className="upload-sub">{messages.imageUpload.dropDescription}</span>
            <span className="upload-hint">{messages.imageUpload.hint}</span>
          </div>
        </label>
      ) : (
        <div className="upload-preview-area">
          <div className="upload-thumb-grid">
            {files.map((f) => (
              <div key={f.id} className="upload-thumb-item">
                <img src={f.previewUrl} alt={f.file.name} className="upload-thumb-img" />
                <button
                  className="upload-thumb-remove"
                  onClick={() => removeFile(f.id)}
                  title={messages.imageUpload.remove}
                >×</button>
                <span className="upload-thumb-name">{f.file.name}</span>
              </div>
            ))}
            <label className="upload-thumb-add" htmlFor="upload-input" title={messages.imageUpload.addFiles}>
              <span>+</span>
            </label>
          </div>
        </div>
      )}

      {error ? <p className="error-msg">{error.message}</p> : null}
      {uploadErrors.length > 0 ? (
        <ul className="error-list">
          {uploadErrors.map((uploadError, index) => (
            <li key={`${uploadError.fileName ?? 'upload'}-${index}`}>{uploadError.message}</li>
          ))}
        </ul>
      ) : null}
      <footer className="upload-footer">
        {hasFiles && (
          <span className="upload-count">{formatSelectedCount(locale, files.length)}</span>
        )}
        <label className="upload-add-btn" htmlFor="upload-input">
          {hasFiles ? messages.imageUpload.addFiles : messages.imageUpload.chooseFiles}
        </label>
        {hasFiles && (
          <button className="upload-confirm-btn" onClick={onConfirm}>
            {messages.imageUpload.confirm}
          </button>
        )}
      </footer>
    </div>
  );
}
