import { useState } from 'react';
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
  onAddMore: () => void;
}

export default function EditWorkspace({ tool, onChangeTool, onBack, onAddMore }: Props) {
  const files = useImageStore((s) => s.files);
  const results = useImageStore((s) => s.results);
  const isProcessing = useImageStore((s) => s.isProcessing);
  const progress = useImageStore((s) => s.progress);
  const error = useImageStore((s) => s.error);
  const processAll = useImageStore((s) => s.processAll);
  const downloadSingle = useImageStore((s) => s.downloadSingle);
  const downloadAll = useImageStore((s) => s.downloadAll);
  const removeFile = useImageStore((s) => s.removeFile);

  const [selectedId, setSelectedId] = useState<string>(() => files[0]?.id ?? '');
  const [options, setOptions] = useState<OptionsPanelState>(DEFAULT_OPTIONS);
  const [showResult, setShowResult] = useState(false);

  const selectedFile = files.find((f) => f.id === selectedId) ?? files[0];
  const selectedResultIndex = results.findIndex((r) => r.sourceFileId === selectedFile?.id);
  const selectedResult = selectedResultIndex >= 0 ? results[selectedResultIndex] : undefined;
  const hasResults = results.length > 0;

  function getToolOptions(): ToolOptions {
    switch (tool) {
      case 'compress':
        return options.compress;
      case 'resize':
        return options.resize;
      case 'convert':
        return options.convert;
      case 'rotate':
        return options.rotate;
      case 'flip':
        return options.flip;
      case 'crop':
        return options.crop ?? { x: 0, y: 0, width: 100, height: 100 };
    }
  }

  async function handleProcess() {
    await processAll(tool, getToolOptions());
    setShowResult(true);
  }

  const previewUrl =
    showResult && selectedResult ? selectedResult.url : selectedFile?.previewUrl;

  const isCropMode = tool === 'crop' && !showResult && !!selectedFile;
  const canProcess =
    !isProcessing && (tool !== 'crop' || options.crop !== null);

  return (
    <div className="edit-page">
      <header className="edit-header">
        <button className="back-btn" onClick={onBack}>
          ← 처음으로
        </button>
        <nav className="tool-tabs">
          {ALL_TOOLS.map((t) => (
            <button
              key={t}
              className={`tool-tab ${tool === t ? 'is-active' : ''}`}
              onClick={() => {
                onChangeTool(t);
                setShowResult(false);
              }}
            >
              {TOOL_LABELS[t]}
            </button>
          ))}
        </nav>
        <button className="add-more-btn" onClick={onAddMore}>
          + 파일 추가
        </button>
      </header>

      <div className="edit-body">
        <aside className="file-strip">
          {files.map((f) => {
            const res = results.find((r) => r.sourceFileId === f.id);
            const isSelected = f.id === (selectedFile?.id ?? '');
            return (
              <div
                key={f.id}
                className={`strip-item ${isSelected ? 'is-selected' : ''}`}
                onClick={() => {
                  setSelectedId(f.id);
                  setShowResult(!!res);
                }}
              >
                <img src={f.previewUrl} alt="" className="strip-thumb" />
                {res && <span className="strip-done">✓</span>}
                <button
                  className="strip-remove"
                  title="삭제"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(f.id);
                    if (isSelected && files.length > 1) {
                      const next = files.find((x) => x.id !== f.id);
                      if (next) setSelectedId(next.id);
                    }
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </aside>

        <div className="preview-area">
          {isCropMode ? (
            <CropEditor
              imageUrl={selectedFile.previewUrl}
              value={options.crop}
              onChange={(crop) => setOptions((o) => ({ ...o, crop }))}
            />
          ) : (
            <div className="preview-frame">
              {previewUrl ? (
                <img src={previewUrl} alt="" className="preview-img" />
              ) : (
                <div className="preview-empty">이미지를 선택하세요</div>
              )}
              {hasResults && selectedResult && (
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

        <aside className="options-panel">
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

            {hasResults && (
              <>
                {selectedResult && (
                  <button
                    className="download-btn"
                    onClick={() => downloadSingle(selectedResultIndex)}
                  >
                    이 파일 다운로드
                  </button>
                )}
                <button className="download-all-btn" onClick={() => downloadAll()}>
                  전체 다운로드 ({results.length}개)
                </button>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
