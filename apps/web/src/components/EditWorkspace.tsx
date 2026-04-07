import { useState, useRef, useEffect } from 'react';
import {
  formatApplyToolLabel,
  formatDownloadAllLabel,
  formatFileCount,
  formatToolReadyMessage,
  useI18n,
} from '../i18n/messages';
import { useImageStore } from '../store/imageStore';
import CropEditor from './CropEditor';
import OptionsPanel, { type OptionsPanelState } from './OptionsPanel';
import ResizeEditor from './ResizeEditor';
import { acceptedImageFormatsHint, acceptedImageInput, bytesToHuman } from '../lib/formatUtils';
import { ALL_TOOLS, getToolDisplayLabel } from '../lib/toolConstants';
import type { ToolName, ToolOptions } from '../types/image';

const MIN_STRIP_WIDTH = 72;
const MAX_STRIP_WIDTH = 440;
const COMPACT_STRIP_HEIGHT_BREAKPOINT = 780;
const COMPACT_STRIP_WIDTH = 58;
const ZOOM_PRESET_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2] as const;

const DEFAULT_OPTIONS: OptionsPanelState = {
  compress: { quality: 80 },
  resize: { width: 1920, height: 1080 },
  convert: { to: 'webp', quality: 85 },
  rotate: { degrees: 0 },
  flip: { horizontal: false, vertical: false },
  crop: null,
};

interface Props {
  tool: ToolName;
  onChangeTool: (t: ToolName) => void;
  onBack: () => void;
}

export default function EditWorkspace({ tool, onChangeTool, onBack }: Props) {
  const emptyPreviewSize = { width: 0, height: 0 };
  const { locale, messages } = useI18n();
  const files = useImageStore((s) => s.files);
  const results = useImageStore((s) => s.results);
  const isProcessing = useImageStore((s) => s.isProcessing);
  const progress = useImageStore((s) => s.progress);
  const error = useImageStore((s) => s.error);
  const uploadErrors = useImageStore((s) => s.uploadErrors);
  const fileErrors = useImageStore((s) => s.fileErrors);
  const processSingle = useImageStore((s) => s.processSingle);
  const downloadSingle = useImageStore((s) => s.downloadSingle);
  const downloadAll = useImageStore((s) => s.downloadAll);
  const removeFile = useImageStore((s) => s.removeFile);
  const resetFile = useImageStore((s) => s.resetFile);
  const addFiles = useImageStore((s) => s.addFiles);

  const [selectedId, setSelectedId] = useState<string>(() => files[0]?.id ?? '');
  const [options, setOptions] = useState<OptionsPanelState>(DEFAULT_OPTIONS);
  const [cropMap, setCropMap] = useState<Record<string, import('../types/image').CropOptions | null>>({});
  const [rotateMap, setRotateMap] = useState<Record<string, number>>({});
  const [flipMap, setFlipMap] = useState<Record<string, { horizontal: boolean; vertical: boolean }>>({});
  const [showResult, setShowResult] = useState(false);
  const [stripWidth, setStripWidth] = useState(280);
  const [compactStrip, setCompactStrip] = useState(
    () => typeof window !== 'undefined' && window.innerHeight <= COMPACT_STRIP_HEIGHT_BREAKPOINT,
  );
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const stripResizeCleanupRef = useRef<(() => void) | null>(null);

  const bodyRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewFrameRef = useRef<HTMLDivElement>(null);
  const [frameDims, setFrameDims] = useState({ w: 0, h: 0 });
  const [previewNaturalSize, setPreviewNaturalSize] = useState(emptyPreviewSize);

  function clampZoom(value: number) {
    return Math.min(8, Math.max(0.25, value));
  }

  function clampPan(nextPan: { x: number; y: number }, nextZoom: number = zoom) {
    const maxOffsetX = Math.max(0, (frameDims.w * Math.abs(nextZoom - 1)) / 2);
    const maxOffsetY = Math.max(0, (frameDims.h * Math.abs(nextZoom - 1)) / 2);

    return {
      x: Math.max(-maxOffsetX, Math.min(maxOffsetX, nextPan.x)),
      y: Math.max(-maxOffsetY, Math.min(maxOffsetY, nextPan.y)),
    };
  }

  function updateZoom(updater: (currentZoom: number) => number) {
    setZoom((currentZoom) => {
      const nextZoom = clampZoom(updater(currentZoom));
      setPan((currentPan) => {
        const nextPan = clampPan(currentPan, nextZoom);
        return nextPan.x === currentPan.x && nextPan.y === currentPan.y ? currentPan : nextPan;
      });
      return nextZoom;
    });
  }

  useEffect(() => {
    return () => {
      stripResizeCleanupRef.current?.();
      document.body.style.cursor = '';
    };
  }, []);

  useEffect(() => {
    function handleWindowResize() {
      setCompactStrip(window.innerHeight <= COMPACT_STRIP_HEIGHT_BREAKPOINT);
    }

    handleWindowResize();
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  useEffect(() => {
    const el = previewFrameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setFrameDims({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Auto-select first file when files are added
  useEffect(() => {
    if (files.length > 0 && !files.find((f) => f.id === selectedId)) {
      setSelectedId(files[0].id);
    }
  }, [files, selectedId]);

  useEffect(() => {
    setPan((currentPan) => {
      const nextPan = clampPan(currentPan);
      return nextPan.x === currentPan.x && nextPan.y === currentPan.y ? currentPan : nextPan;
    });
  }, [frameDims.h, frameDims.w, zoom]);


  function handleWheelZoom(e: React.WheelEvent) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    updateZoom((currentZoom) => currentZoom * factor);
  }

  function handleZoomPointerDown(e: React.PointerEvent) {
    if (!previewUrl) {
      return;
    }

    if (e.pointerType !== 'touch' && e.button !== 0) {
      return;
    }

    const target = e.target as HTMLElement | null;
    if (target?.closest('.zoom-controls, .toggle-btn')) {
      return;
    }

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    setIsPanning(true);
  }

  function handleZoomPointerMove(e: React.PointerEvent) {
    if (!panStartRef.current) return;
    setPan(clampPan({
      x: panStartRef.current.panX + (e.clientX - panStartRef.current.x),
      y: panStartRef.current.panY + (e.clientY - panStartRef.current.y),
    }));
  }

  function handleZoomPointerUp(e?: React.PointerEvent) {
    if (e && (e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }
    panStartRef.current = null;
    setIsPanning(false);
  }

  function resetZoom() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function setZoomPreset(nextZoom: number) {
    updateZoom(() => nextZoom);
  }

  function handleCropChange(crop: import('../types/image').CropOptions | null) {
    if (!selectedFile) return;
    setCropMap((m) => ({ ...m, [selectedFile.id]: crop }));
  }

  function handleOptionsChange(next: OptionsPanelState) {
    setOptions(next);
    if (!selectedFile) return;
    if (tool === 'crop') setCropMap((m) => ({ ...m, [selectedFile.id]: next.crop }));
    if (tool === 'rotate') setRotateMap((m) => ({ ...m, [selectedFile.id]: next.rotate.degrees }));
    if (tool === 'flip') setFlipMap((m) => ({ ...m, [selectedFile.id]: next.flip }));
  }

  function handleAddFiles(incoming: File[]) {
    if (incoming.length > 0) addFiles(incoming);
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
    if (compactStrip) {
      return;
    }

    if (e.button !== 0) {
      return;
    }

    e.preventDefault();
    stripResizeCleanupRef.current?.();
    document.body.style.cursor = 'col-resize';

    function stopResizing() {
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', stopResizing);
      window.removeEventListener('blur', stopResizing);
      if (stripResizeCleanupRef.current === stopResizing) {
        stripResizeCleanupRef.current = null;
      }
    }

    function onMouseMove(ev: MouseEvent) {
      if ((ev.buttons & 1) === 0) {
        stopResizing();
        return;
      }

      const body = bodyRef.current;
      if (!body) return;
      const rect = body.getBoundingClientRect();
      const maxWidth = Math.max(MIN_STRIP_WIDTH, Math.min(MAX_STRIP_WIDTH, rect.width - 524));
      setStripWidth(Math.max(MIN_STRIP_WIDTH, Math.min(maxWidth, ev.clientX - rect.left)));
    }

    stripResizeCleanupRef.current = stopResizing;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', stopResizing);
    window.addEventListener('blur', stopResizing);
  }

  const selectedFile = files.find((f) => f.id === selectedId) ?? files[0];
  const selectedResultIndex = results.findIndex((r) => r.sourceFileId === selectedFile?.id);
  const selectedResult = selectedResultIndex >= 0 ? results[selectedResultIndex] : undefined;
  const hasFiles = files.length > 0;
  const processingErrors = Object.values(fileErrors);
  const visibleProcessingErrors = processingErrors.filter((fileError) => fileError.message !== error?.message);

  // Derived directly from cropMap — no async effect lag
  const currentCrop = cropMap[selectedFile?.id ?? ''] ?? null;

  function getToolOptions(): ToolOptions {
    switch (tool) {
      case 'compress': return options.compress;
      case 'resize':   return options.resize;
      case 'convert':  return options.convert;
      case 'rotate':   return options.rotate;
      case 'flip':     return options.flip;
      case 'crop':     return currentCrop ?? { x: 0, y: 0, width: 100, height: 100 };
    }
  }

  function getPreviewTransform() {
    if (tool === 'rotate') {
      if (!selectedFile) {
        return undefined;
      }

      const delta = (options.rotate.degrees - selectedFile.committedRotateDegrees + 360) % 360;
      return delta === 0 ? undefined : `rotate(${delta}deg)`;
    }

    if (tool === 'flip') {
      if (!selectedFile) {
        return undefined;
      }

      const horizontal = options.flip.horizontal !== selectedFile.committedFlipHorizontal;
      const vertical = options.flip.vertical !== selectedFile.committedFlipVertical;
      if (!horizontal && !vertical) {
        return undefined;
      }

      return `scale(${horizontal ? -1 : 1}, ${vertical ? -1 : 1})`;
    }

    return undefined;
  }

  function getPreviewRotationDegrees() {
    if (tool !== 'rotate' || !selectedFile) {
      return 0;
    }

    const delta = options.rotate.degrees - selectedFile.committedRotateDegrees;
    const normalized = delta % 360;
    return normalized < 0 ? normalized + 360 : normalized;
  }

  function handlePreviewImageLoad(event: React.SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    if (!naturalWidth || !naturalHeight) {
      return;
    }

    setPreviewNaturalSize((current) => {
      if (current.width === naturalWidth && current.height === naturalHeight) {
        return current;
      }

      return { width: naturalWidth, height: naturalHeight };
    });
  }

  function resetCurrentPreviewChanges() {
    if (!selectedFile) return;
    const id = selectedFile.id;
    switch (tool) {
      case 'rotate':
        setOptions((current) => ({ ...current, rotate: { degrees: selectedFile.committedRotateDegrees } }));
        setRotateMap((m) => { const n = { ...m }; delete n[id]; return n; });
        break;
      case 'flip':
        setOptions((current) => ({ ...current, flip: { horizontal: selectedFile.committedFlipHorizontal, vertical: selectedFile.committedFlipVertical } }));
        setFlipMap((m) => { const n = { ...m }; delete n[id]; return n; });
        break;
      case 'crop':
        setCropMap((m) => ({ ...m, [id]: null }));
        break;
      default:
        break;
    }
  }

  async function handleProcess() {
    if (!selectedFile) {
      return;
    }
    const id = selectedFile.id;
    const completed = await processSingle(id, tool, getToolOptions());
    if (!completed) {
      return;
    }

    // Clear the per-file pending state — it's now committed in the store
    if (tool === 'rotate') setRotateMap((m) => { const n = { ...m }; delete n[id]; return n; });
    if (tool === 'flip') setFlipMap((m) => { const n = { ...m }; delete n[id]; return n; });
    if (tool === 'crop') setCropMap((m) => { const n = { ...m }; delete n[id]; return n; });

    setShowResult(false);
  }

  function switchTool(t: ToolName) {
    onChangeTool(t);
    setShowResult(false);
  }

  const basePreviewUrl = selectedFile?.previewUrl;
  const previewUrl = showResult && selectedResult ? selectedResult.url : basePreviewUrl;
  const isCropMode = tool === 'crop' && !showResult && !!selectedFile;
  const isResizeMode = tool === 'resize' && !!selectedFile;

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setPreviewNaturalSize(emptyPreviewSize);
  }, [previewUrl]);

  const canProcess = !isProcessing
    && !!selectedFile
    && (tool !== 'crop' || currentCrop !== null)
    && (tool !== 'rotate' || selectedFile.committedRotateDegrees !== options.rotate.degrees)
    && (tool !== 'flip'
      || selectedFile.committedFlipHorizontal !== options.flip.horizontal
      || selectedFile.committedFlipVertical !== options.flip.vertical);
  const previewTransform = getPreviewTransform();
  const previewRotationDegrees = getPreviewRotationDegrees();
  const rotatedPreviewFrameStyle: React.CSSProperties | undefined = previewRotationDegrees !== 0
    && previewNaturalSize.width > 0
    && previewNaturalSize.height > 0
    && frameDims.w > 0
    && frameDims.h > 0
    ? (() => {
        const radians = (previewRotationDegrees * Math.PI) / 180;
        const absSin = Math.abs(Math.sin(radians));
        const absCos = Math.abs(Math.cos(radians));
        const rotatedWidth = previewNaturalSize.width * absCos + previewNaturalSize.height * absSin;
        const rotatedHeight = previewNaturalSize.width * absSin + previewNaturalSize.height * absCos;
        const scale = Math.min(1, frameDims.w / rotatedWidth, frameDims.h / rotatedHeight);

        return {
          width: previewNaturalSize.width * scale,
          height: previewNaturalSize.height * scale,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: '0 0 auto',
        };
      })()
    : undefined;
  const previewImageStyle: React.CSSProperties | undefined = previewTransform
    ? {
        transform: previewTransform,
        display: 'block',
      }
    : {
        display: 'block',
      };
  const rotatedPreviewImageStyle: React.CSSProperties | undefined = rotatedPreviewFrameStyle
    ? {
        ...previewImageStyle,
        width: '100%',
        height: '100%',
        maxWidth: 'none',
        maxHeight: 'none',
        objectFit: 'contain',
      }
    : previewImageStyle;
  const canResetSelected = Boolean(
    selectedFile
      && (selectedFile.file !== selectedFile.originalFile
        || selectedFile.previewUrl !== selectedFile.originalPreviewUrl
        || selectedResult
        || options.rotate.degrees !== selectedFile.committedRotateDegrees
        || options.flip.horizontal !== selectedFile.committedFlipHorizontal
        || options.flip.vertical !== selectedFile.committedFlipVertical
        || currentCrop !== null),
  );
  const toolLabel = getToolDisplayLabel(tool, locale);
  const zoomPresetValue = ZOOM_PRESET_LEVELS.some((level) => Math.abs(level - zoom) < 0.001)
    ? String(zoom)
    : 'custom';
  const effectiveStripWidth = compactStrip ? COMPACT_STRIP_WIDTH : stripWidth;

  useEffect(() => {
    if (!selectedFile) return;

    if (tool === 'rotate') {
      const saved = rotateMap[selectedFile.id];
      const degrees = saved !== undefined ? saved : selectedFile.committedRotateDegrees;
      setOptions((current) => {
        if (current.rotate.degrees === degrees) return current;
        return { ...current, rotate: { degrees } };
      });
    }

    if (tool === 'flip') {
      const saved = flipMap[selectedFile.id];
      const horizontal = saved !== undefined ? saved.horizontal : selectedFile.committedFlipHorizontal;
      const vertical = saved !== undefined ? saved.vertical : selectedFile.committedFlipVertical;
      setOptions((current) => {
        if (current.flip.horizontal === horizontal && current.flip.vertical === vertical) return current;
        return { ...current, flip: { horizontal, vertical } };
      });
    }
  }, [selectedFile?.id, tool]);

  return (
    <div className="edit-page">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedImageInput}
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />

      <header className="edit-header">
        <button className="back-btn" onClick={onBack}>{messages.editor.backHome}</button>
        <nav className="tool-tabs">
          {ALL_TOOLS.map((t) => (
            <button
              key={t}
              className={`tool-tab ${tool === t ? 'is-active' : ''}`}
              onClick={() => switchTool(t)}
            >
              {getToolDisplayLabel(t, locale)}
            </button>
          ))}
        </nav>
        <button className="add-more-btn" onClick={() => fileInputRef.current?.click()}>
          {messages.editor.addFiles}
        </button>
      </header>

      <div
        className={`edit-body ${compactStrip ? 'is-compact-strip' : ''}`}
        ref={bodyRef}
        style={{ gridTemplateColumns: `${effectiveStripWidth}px ${compactStrip ? '0px' : '4px'} 1fr 280px` }}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {/* Left: file strip */}
        <aside className="file-strip">
          {files.map((f, index) => {
            const res = results.find((r) => r.sourceFileId === f.id);
            const isSelected = f.id === (selectedFile?.id ?? '');
            return (
              <div
                key={f.id}
                className={`strip-item ${isSelected ? 'is-selected' : ''}`}
                onClick={() => { setSelectedId(f.id); setShowResult(!!res); }}
              >
                <img src={f.previewUrl} alt="" className="strip-thumb" />
                <span className="strip-page">{index + 1}</span>
                {res && <span className="strip-done">✓</span>}
                <button
                  className="strip-remove"
                  title={messages.editor.remove}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(f.id);
                  }}
                >×</button>
              </div>
            );
          })}
          <button
            className="strip-add-btn"
            onClick={() => fileInputRef.current?.click()}
            title={messages.editor.addFiles}
          >
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
              <strong>{messages.editor.emptyDropTitle}</strong>
              <span>{acceptedImageFormatsHint}</span>
            </div>
          ) : isCropMode ? (
            <CropEditor
              key={selectedFile.id}
              imageUrl={selectedFile.previewUrl}
              value={currentCrop}
              onChange={handleCropChange}
            />
          ) : isResizeMode ? (
            <ResizeEditor
              imageUrl={selectedFile.previewUrl}
              width={options.resize.width}
              height={options.resize.height}
              crop={options.resize.crop}
              onChange={(nextResize) => setOptions((current) => ({ ...current, resize: nextResize }))}
            />
          ) : (
            <div
              ref={previewFrameRef}
              className={`preview-frame ${previewUrl ? 'is-pannable' : ''} ${isPanning ? 'is-panning' : ''}`}
              onWheel={handleWheelZoom}
              onDoubleClick={resetZoom}
              onPointerDown={handleZoomPointerDown}
              onPointerMove={handleZoomPointerMove}
              onPointerUp={handleZoomPointerUp}
              onPointerCancel={handleZoomPointerUp}
            >
              {previewUrl ? (
                <div
                  className="zoom-container"
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  }}
                >
                  {rotatedPreviewFrameStyle ? (
                    <div style={rotatedPreviewFrameStyle}>
                      <img
                        src={previewUrl}
                        alt=""
                        className="preview-img"
                        style={rotatedPreviewImageStyle}
                        draggable={false}
                        onLoad={handlePreviewImageLoad}
                      />
                    </div>
                  ) : (
                    <img
                      src={previewUrl}
                      alt=""
                      className="preview-img"
                      style={previewImageStyle}
                      draggable={false}
                      onLoad={handlePreviewImageLoad}
                    />
                  )}
                </div>
              ) : (
                <div className="preview-empty">{messages.editor.emptyPreview}</div>
              )}
              <div className="zoom-controls">
                <button
                  className="zoom-btn"
                  onClick={() => updateZoom((currentZoom) => currentZoom * 1.25)}
                  title={messages.editor.zoomIn}
                  type="button"
                >
                  +
                </button>
                <select
                  className="zoom-select"
                  value={zoomPresetValue}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    if (nextValue === 'fit') {
                      resetZoom();
                      return;
                    }

                    if (nextValue === 'custom') {
                      return;
                    }

                    setZoomPreset(Number(nextValue));
                  }}
                  title={messages.editor.zoomFit}
                  aria-label={messages.editor.zoomFit}
                >
                  <option value="fit">{messages.editor.zoomPresetFit}</option>
                  {ZOOM_PRESET_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {Math.round(level * 100)}%
                    </option>
                  ))}
                  {zoomPresetValue === 'custom' ? (
                    <option value="custom">{Math.round(zoom * 100)}%</option>
                  ) : null}
                </select>
                <button
                  className="zoom-btn"
                  onClick={() => updateZoom((currentZoom) => currentZoom / 1.25)}
                  title={messages.editor.zoomOut}
                  type="button"
                >
                  −
                </button>
              </div>
              {selectedResult && (
                <button className="toggle-btn" onClick={() => setShowResult((v) => !v)}>
                  {showResult ? messages.workspace.original : messages.workspace.processed}
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
                  {selectedResult.size < selectedResult.sourceSize && (
                    <span className="meta-savings">
                      −{Math.round((1 - selectedResult.size / selectedResult.sourceSize) * 100)}%
                    </span>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: options */}
        <aside className="options-panel">
          <>
            <div className="options-scroll">
              {hasFiles ? (
                <>
                  <h3 className="panel-title">{`${toolLabel} ${messages.editor.optionsSuffix}`}</h3>
                  <OptionsPanel tool={tool} state={{ ...options, crop: currentCrop }} onChange={handleOptionsChange} />
                </>
              ) : (
                <div className="crop-guide">
                  <div className="crop-guide-icon">＋</div>
                  <p>{formatToolReadyMessage(locale, toolLabel)}</p>
                </div>
              )}
              {results.length > 0 ? (
                <div className="done-panel">
                  <div className="done-header">
                    <span className="done-check">✓</span>
                    <div>
                      <strong className="done-title">{messages.editor.doneTitle}</strong>
                      <span className="done-sub">{formatFileCount(locale, results.length)}</span>
                    </div>
                  </div>
                  <div className="done-list">
                    {results.map((r, i) => {
                      const saved = r.size < r.sourceSize
                        ? Math.round((1 - r.size / r.sourceSize) * 100) : null;
                      const pageNum = files.findIndex((f) => f.id === r.sourceFileId) + 1;
                      return (
                        <div key={r.id} className="done-item-row">
                          {pageNum > 0 && <span className="done-item-page">{pageNum}</span>}
                          <div className="done-item">
                          <div className="done-item-info">
                            <span className="done-item-name">{r.name}</span>
                            <div className="done-item-meta">
                              <span>{bytesToHuman(r.sourceSize)} → {bytesToHuman(r.size)}</span>
                              {saved !== null && <span className="done-item-saved">−{saved}%</span>}
                            </div>
                          </div>
                          <button className="done-item-dl" onClick={() => downloadSingle(i)}>↓</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {error && <p className="error-msg">{error.message}</p>}
              {uploadErrors.length > 0 ? (
                <ul className="error-list">
                  {uploadErrors.map((uploadError, index) => (
                    <li key={`${uploadError.fileName ?? 'upload'}-${index}`}>{uploadError.message}</li>
                  ))}
                </ul>
              ) : null}
              {visibleProcessingErrors.length > 0 ? (
                <ul className="error-list">
                  {visibleProcessingErrors.map((fileError) => (
                    <li key={fileError.fileId ?? fileError.fileName ?? fileError.message}>{fileError.message}</li>
                  ))}
                </ul>
              ) : null}
              {isProcessing && (
                <div className="progress-wrap">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="progress-label">{progress}%</span>
                </div>
              )}
            </div>
            {hasFiles ? (
              <div className="panel-actions">
                <button
                  className="re-edit-btn"
                  onClick={() => {
                    if (!selectedFile) {
                      return;
                    }
                    resetFile(selectedFile.id);
                    resetCurrentPreviewChanges();
                    setShowResult(false);
                  }}
                  disabled={!canResetSelected || isProcessing}
                >
                  {messages.editor.resetCurrentImage}
                </button>
                <button className="process-btn" onClick={handleProcess} disabled={!canProcess}>
                  {isProcessing ? messages.editor.processing : formatApplyToolLabel(locale, toolLabel)}
                </button>
                <button
                  className="re-edit-btn"
                  onClick={() => downloadAll()}
                  disabled={results.length === 0}
                >
                  {formatDownloadAllLabel(locale, results.length)}
                </button>
              </div>
            ) : null}
          </>
        </aside>
      </div>

    </div>
  );
}
