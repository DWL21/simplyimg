import { useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Upload, ArrowLeft, Lock, Plus, X } from 'lucide-react';
import { formatSelectedCount, useI18n } from '../i18n/messages';
import { acceptedImageInput } from '../lib/formatUtils';
import { getToolDisplayLabel } from '../lib/toolConstants';
import { useImageStore } from '../store/imageStore';
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
  const toolLabel = getToolDisplayLabel(tool, locale);

  return (
    <div
      className="upload-page"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <input
        ref={inputRef}
        id="upload-input"
        type="file"
        multiple
        accept={acceptedImageInput}
        onChange={handleChange}
        style={{ display: 'none' }}
      />

      {/* New-design header */}
      <header className="upload-header-new">
        <div className="upload-header-left">
          <button className="upload-back-btn" onClick={onBack}>
            <ArrowLeft size={14} />
            {messages.imageUpload.back}
          </button>
          <div className="upload-header-divider" />
          <Link to="/" className="wordmark" style={{ fontSize: 15 }}>
            <span className="wordmark-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="2" width="20" height="20" rx="6" stroke="currentColor" strokeWidth="1.6" />
                <path d="M6 16l4-4 3 3 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="9" cy="9" r="1.4" fill="currentColor" />
              </svg>
            </span>
            Simply<span className="wordmark-light">Img</span>
          </Link>
        </div>
        <span className="upload-tool-badge">{toolLabel}</span>
      </header>

      {/* Drop zone or file list */}
      {!hasFiles ? (
        <div className="upload-center">
          <div className="upload-center-inner">
            <label htmlFor="upload-input" className="upload-dropzone-new">
              <div className="upload-dropzone-icon">
                <Upload size={28} strokeWidth={1.4} />
              </div>
              <strong className="upload-dropzone-heading">{messages.imageUpload.dropTitle}</strong>
              <p className="upload-dropzone-sub">{messages.imageUpload.dropDescription}</p>
              <span className="upload-dropzone-hint">{messages.imageUpload.hint}</span>
            </label>

            <div className="upload-privacy-note">
              <Lock size={12} />
              <span>{locale === 'ko' ? '파일은 업로드되지 않습니다. 전부 브라우저에서 처리돼요.' : 'Files never leave your browser.'}</span>
            </div>
          </div>
        </div>
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
                >
                  <X size={12} />
                </button>
                <span className="upload-thumb-name">{f.file.name}</span>
              </div>
            ))}
            <label className="upload-thumb-add" htmlFor="upload-input" title={messages.imageUpload.addFiles}>
              <Plus size={20} />
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
