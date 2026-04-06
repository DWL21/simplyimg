import { useState, useRef, useEffect } from 'react';
import { useImageStore } from '../store/imageStore';
import CropEditor from './CropEditor';
import OptionsPanel, { type OptionsPanelState } from './OptionsPanel';
import { bytesToHuman } from '../lib/formatUtils';
import { TOOL_LABELS, ALL_TOOLS } from '../lib/toolConstants';
import type { ToolName, ToolOptions } from '../types/image';

const DEFAULT_OPTIONS: OptionsPanelState = {
  compress: { quality: 80, format: undefined },
  resize: { width: 1920, height: 1080, fit: 'contain' },
  convert: { to: 'webp', quality: 85 },
  rotate: { degrees: 90 },
  flip: { horizontal: true },
  crop: null,
};

interface Props {
  tool: ToolName;
  onChangeTool: (t: ToolName) => void;
  onBack: () => void;
}

export default function EditWorkspace({ tool, onChangeTool, onBack }: Props) {
  const files = useImageStore((s) => s.files);
  const results = useImageStore((s) => s.results);
  const isProcessing = useImageStore((s) => s.isProcessing);
  const progress = useImageStore((s) => s.progress);
  const error = useImageStore((s) => s.error);
  const processAll = useImageStore((s) => s.processAll);
  const downloadSingle = useImageStore((s) => s.downloadSingle);
  const downloadAll = useImageStore((s) => s.downloadAll);
  const removeFile = useImageStore((s) => s.removeFile);
  const addFiles = useImageStore((s) => s.addFiles);

  const [selectedId, setSelectedId] = useState<string>(() => files[0]?.id ?? '');
  const [options, setOptions] = useState<OptionsPanelState>(DEFAULT_OPTIONS);
  const [showResult, setShowResult] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [stripWidth, setStripWidth] = useState(280);

  const bodyRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => { document.body.style.cursor = ''; };
  }, []);

  // Auto-select first file when files are added
  useEffect(() => {
    if (files.length > 0 && !files.find((f) => f.id === selectedId)) {
      setSelectedId(files[0].id);
    }
  }, [files, selectedId]);

  function handleAddFiles(incoming: File[]) {
    const images = incoming.filter((f) => f.type.startsWith('image/'));
    if (images.length > 0) addFiles(images);
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleAddFiles(Array.from(e.target.files ?? []));
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    handleAddFiles(Array.from(e.dataTransfer.files));
  }

  function handleDividerMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    document.body.style.cursor = 'col-resize';

    function onMouseMove(ev: MouseEvent) {
      const body = bodyRef.current;
      if (!body) return;
      const rect = body.getBoundingClientRect();
      setStripWidth(Math.max(72, Math.min(320, ev.clientX - rect.left)));
    }

    function onMouseUp() {
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  const selectedFile = files.find((f) => f.id === selectedId) ?? files[0];
  const selectedResultIndex = results.findIndex((r) => r.sourceFileId === selectedFile?.id);
  const selectedResult = selectedResultIndex >= 0 ? results[selectedResultIndex] : undefined;
  const hasFiles = files.length > 0;

  function getToolOptions(): ToolOptions {
    switch (tool) {
      case 'compress': return options.compress;
      case 'resize':   return options.resize;
      case 'convert':  return options.convert;
      case 'rotate':   return options.rotate;
      case 'flip':     return options.flip;
      case 'crop':     return options.crop ?? { x: 0, y: 0, width: 100, height: 100 };
    }
  }

  async function handleProcess() {
    await processAll(tool, getToolOptions());
    setShowResult(true);
    setIsDone(true);
  }

  function switchTool(t: ToolName) {
    onChangeTool(t);
    setShowResult(false);
    setIsDone(false);
  }

  const previewUrl = showResult && selectedResult ? selectedResult.url : selectedFile?.previewUrl;
  const isCropMode = tool === 'crop' && !showResult && !!selectedFile;
  const canProcess = !isProcessing && (tool !== 'crop' || options.crop !== null);

  return (
    <div className="edit-page">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />

      <header className="edit-header">
        <button className="back-btn" onClick={onBack}>← 처음으로</button>
        <nav className="tool-tabs">
          {ALL_TOOLS.map((t) => (
            <button
              key={t}
              className={`tool-tab ${tool === t ? 'is-active' : ''}`}
              onClick={() => switchTool(t)}
            >
              {TOOL_LABELS[t]}
            </button>
          ))}
        </nav>
        <button className="add-more-btn" onClick={() => fileInputRef.current?.click()}>
          + 파일 추가
        </button>
      </header>

      <div
        className="edit-body"
        ref={bodyRef}
        style={{ gridTemplateColumns: `${stripWidth}px 4px 1fr 280px` }}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {/* Left: file strip */}
        <aside className="file-strip">
          {files.map((f) => {
            const res = results.find((r) => r.sourceFileId === f.id);
            const isSelected = f.id === (selectedFile?.id ?? '');
            return (
              <div
                key={f.id}
                className={`strip-item ${isSelected ? 'is-selected' : ''}`}
                onClick={() => { setSelectedId(f.id); setShowResult(!!res); }}
              >
                <img src={f.previewUrl} alt="" className="strip-thumb" />
                {res && <span className="strip-done">✓</span>}
                <button
                  className="strip-remove"
                  title="삭제"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(f.id);
                  }}
                >×</button>
              </div>
            );
          })}
          <button className="strip-add-btn" onClick={() => fileInputRef.current?.click()} title="파일 추가">
            +
          </button>
        </aside>

        <div className="strip-divider" onMouseDown={handleDividerMouseDown} />

        {/* Center: preview */}
        <div className="preview-area">
          {!hasFiles ? (
            <div className="edit-empty" onClick={() => fileInputRef.current?.click()}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <strong>이미지를 끌어다 놓거나 클릭하여 추가</strong>
              <span>JPG · PNG · WebP · GIF</span>
            </div>
          ) : isCropMode ? (
            <CropEditor
              imageUrl={selectedFile.previewUrl}
              value={options.crop}
              onChange={(crop) => setOptions((o) => ({ ...o, crop }))}
            />
          ) : (
            <div className="preview-frame">
              {previewUrl
                ? <img src={previewUrl} alt="" className="preview-img" />
                : <div className="preview-empty">이미지를 선택하세요</div>
              }
              {selectedResult && (
                <button className="toggle-btn" onClick={() => setShowResult((v) => !v)}>
                  {showResult ? '원본' : '결과'}
                </button>
              )}
            </div>
          )}

          {selectedFile && (
            <div className="file-meta-bar">
              <span className="meta-filename">{selectedFile.file.name}</span>
              <span className="meta-size">{bytesToHuman(selectedFile.file.size)}</span>
              {selectedResult && (
                <>
                  <span className="meta-arrow">→</span>
                  <span className="meta-result-size">{bytesToHuman(selectedResult.size)}</span>
                  {selectedResult.size < selectedFile.file.size && (
                    <span className="meta-savings">
                      −{Math.round((1 - selectedResult.size / selectedFile.file.size) * 100)}%
                    </span>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: options or results */}
        <aside className="options-panel">
          {isDone ? (
            <div className="done-panel">
              <div className="done-header">
                <span className="done-check">✓</span>
                <div>
                  <strong className="done-title">처리 완료</strong>
                  <span className="done-sub">{results.length}개 파일</span>
                </div>
              </div>
              <div className="done-list">
                {results.map((r, i) => {
                  const src = files.find((f) => f.id === r.sourceFileId);
                  const saved = src && r.size < src.file.size
                    ? Math.round((1 - r.size / src.file.size) * 100) : null;
                  return (
                    <div key={r.id} className="done-item">
                      <div className="done-item-info">
                        <span className="done-item-name">{r.name}</span>
                        <div className="done-item-meta">
                          {src && <span>{bytesToHuman(src.file.size)} → {bytesToHuman(r.size)}</span>}
                          {saved !== null && <span className="done-item-saved">−{saved}%</span>}
                        </div>
                      </div>
                      <button className="done-item-dl" onClick={() => downloadSingle(i)}>↓</button>
                    </div>
                  );
                })}
              </div>
              <div className="done-actions">
                <button className="process-btn" onClick={() => downloadAll()}>
                  전체 다운로드 ({results.length}개)
                </button>
                <button className="re-edit-btn" onClick={() => { setIsDone(false); setShowResult(false); }}>
                  다시 편집
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="options-scroll">
                <h3 className="panel-title">{TOOL_LABELS[tool]} 옵션</h3>
                <OptionsPanel tool={tool} state={options} onChange={setOptions} />
                {error && <p className="error-msg">{error}</p>}
                {isProcessing && (
                  <div className="progress-wrap">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="progress-label">{progress}%</span>
                  </div>
                )}
              </div>
              <div className="panel-actions">
                <button className="process-btn" onClick={handleProcess} disabled={!canProcess}>
                  {isProcessing ? '처리 중…' : `${TOOL_LABELS[tool]} 적용`}
                </button>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
