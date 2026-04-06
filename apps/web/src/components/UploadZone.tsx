import { useCallback, useRef } from 'react';
import { acceptedImageInput, isSupportedImageFile } from '../lib/formatUtils';
import { useImageStore } from '../store/imageStore';
import { TOOL_LABELS } from '../lib/toolConstants';
import Brand from './Brand';
import type { ToolName } from '../types/image';

interface Props {
  tool: ToolName;
  onConfirm: () => void;
  onBack: () => void;
}

export default function UploadZone({ tool, onConfirm, onBack }: Props) {
  const files = useImageStore((s) => s.files);
  const addFiles = useImageStore((s) => s.addFiles);
  const removeFile = useImageStore((s) => s.removeFile);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (incoming: File[]) => {
      const images = incoming.filter(isSupportedImageFile);
      if (images.length > 0) addFiles(images);
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
        <button className="back-btn" onClick={onBack}>← 뒤로</button>
        <Brand />
        <span className="tool-badge">{TOOL_LABELS[tool]}</span>
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
            <strong className="upload-heading">이미지를 끌어다 놓거나</strong>
            <span className="upload-sub">클릭해서 파일을 선택하세요</span>
            <span className="upload-hint">JPG · PNG · WebP · SVG · HEIC/HEIF · 여러 파일 동시 가능</span>
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
                  title="삭제"
                >×</button>
                <span className="upload-thumb-name">{f.file.name}</span>
              </div>
            ))}
            <label className="upload-thumb-add" htmlFor="upload-input" title="파일 추가">
              <span>+</span>
            </label>
          </div>
        </div>
      )}

      <footer className="upload-footer">
        {hasFiles && (
          <span className="upload-count">{files.length}개 선택됨</span>
        )}
        <label className="upload-add-btn" htmlFor="upload-input">
          {hasFiles ? '+ 파일 추가' : '파일 선택'}
        </label>
        {hasFiles && (
          <button className="upload-confirm-btn" onClick={onConfirm}>
            확인 →
          </button>
        )}
      </footer>
    </div>
  );
}
