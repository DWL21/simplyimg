import { useCallback } from 'react';
import { useImageStore } from '../store/imageStore';
import { useDropZone } from '../hooks/useDropZone';
import { TOOL_LABELS } from '../lib/toolConstants';
import Brand from './Brand';
import type { ToolName } from '../types/image';

interface Props {
  tool: ToolName;
  onFilesAdded: () => void;
  onBack: () => void;
}

export default function UploadZone({ tool, onFilesAdded, onBack }: Props) {
  const addFiles = useImageStore((s) => s.addFiles);

  const handleFiles = useCallback(
    (files: File[]) => {
      const images = files.filter((f) => f.type.startsWith('image/'));
      if (images.length === 0) return;
      addFiles(images);
      onFilesAdded();
    },
    [addFiles, onFilesAdded],
  );

  const dropHandlers = useDropZone(handleFiles);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) handleFiles(files);
  }

  return (
    <div className="upload-page">
      <header className="upload-header">
        <button className="back-btn" onClick={onBack}>
          ← 뒤로
        </button>
        <Brand />
        <span className="tool-badge">{TOOL_LABELS[tool]}</span>
      </header>

      <label className="upload-dropzone" htmlFor="upload-input" {...dropHandlers}>
        <input
          id="upload-input"
          type="file"
          multiple
          accept="image/*"
          onChange={handleChange}
        />
        <div className="upload-inner">
          <div className="upload-icon">
            <svg
              width="52"
              height="52"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <strong className="upload-heading">이미지를 끌어다 놓거나</strong>
          <span className="upload-sub">클릭해서 파일을 선택하세요</span>
          <span className="upload-hint">JPG · PNG · WebP · GIF · 여러 파일 동시 가능</span>
        </div>
      </label>
    </div>
  );
}
