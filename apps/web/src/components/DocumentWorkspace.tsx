import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  formatPageCount,
  formatPageLabel,
  formatPagePreviewLabel,
  useI18n,
} from '../i18n/messages';
import { useDocumentStore } from '../store/documentStore';
import { bytesToHuman } from '../lib/formatUtils';

interface DocumentWorkspaceProps {
  onBack: () => void;
}

const MIN_PAGE_STRIP_WIDTH = 112;
const MAX_PAGE_STRIP_WIDTH = 280;

export default function DocumentWorkspace({ onBack }: DocumentWorkspaceProps) {
  const defaultStripWidth = 144;
  const { locale, messages } = useI18n();
  const files = useDocumentStore((state) => state.files);
  const previewHtml = useDocumentStore((state) => state.previewHtml);
  const options = useDocumentStore((state) => state.options);
  const isProcessing = useDocumentStore((state) => state.isProcessing);
  const progress = useDocumentStore((state) => state.progress);
  const error = useDocumentStore((state) => state.error);
  const addFiles = useDocumentStore((state) => state.addFiles);
  const removeFile = useDocumentStore((state) => state.removeFile);
  const updateOptions = useDocumentStore((state) => state.updateOptions);
  const printDocument = useDocumentStore((state) => state.printDocument);

  const [selectedId, setSelectedId] = useState<string>('');
  const [pageCount, setPageCount] = useState(0);
  const [activePage, setActivePage] = useState(0);
  const [pageThumbs, setPageThumbs] = useState<{ headHtml: string; pages: string[] }>({ headHtml: '', pages: [] });
  const [pageStripWidth, setPageStripWidth] = useState(defaultStripWidth);
  const stripResizeCleanupRef = useRef<(() => void) | null>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const selectedFile = useMemo(
    () => files.find((file) => file.id === selectedId) ?? files[0],
    [files, selectedId],
  );

  useEffect(() => {
    if (files.length > 0 && !files.find((file) => file.id === selectedId)) {
      setSelectedId(files[0].id);
      return;
    }

    if (files.length === 0 && selectedId) {
      setSelectedId('');
    }
  }, [files, selectedId]);

  // Reset page state when preview HTML changes
  useEffect(() => {
    setPageCount(0);
    setActivePage(0);
    setPageThumbs({ headHtml: '', pages: [] });
  }, [previewHtml]);

  const handleMessage = useCallback((event: MessageEvent) => {
    if (event.data?.type === 'doc-page-count') {
      setPageCount(event.data.count as number);
    } else if (event.data?.type === 'doc-active-page') {
      setActivePage(event.data.index as number);
    } else if (event.data?.type === 'doc-page-thumbnails') {
      setPageThumbs({ headHtml: event.data.headHtml as string, pages: event.data.pages as string[] });
    }
  }, []);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  useEffect(() => {
    if (!selectedFile) {
      return;
    }

    void updateOptions({});
  }, [locale, selectedFile?.id, updateOptions]);

  useEffect(() => () => {
    stripResizeCleanupRef.current?.();
    document.body.style.cursor = '';
  }, []);

  function scrollToPage(index: number) {
    iframeRef.current?.contentWindow?.postMessage({ type: 'doc-scroll-to-page', index }, '*');
    setActivePage(index);
  }

  function handleStripDividerMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    stripResizeCleanupRef.current?.();
    document.body.style.cursor = 'col-resize';

    function stopResizing() {
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopResizing);
      window.removeEventListener('blur', stopResizing);
      if (stripResizeCleanupRef.current === stopResizing) {
        stripResizeCleanupRef.current = null;
      }
    }

    function handleMouseMove(nextEvent: MouseEvent) {
      if ((nextEvent.buttons & 1) === 0) {
        stopResizing();
        return;
      }

      const workspace = workspaceRef.current;
      if (!workspace) {
        return;
      }

      const rect = workspace.getBoundingClientRect();
      const nextWidth = nextEvent.clientX - rect.left;
      const maxWidth = Math.max(
        MIN_PAGE_STRIP_WIDTH,
        Math.min(MAX_PAGE_STRIP_WIDTH, rect.width - 624),
      );
      setPageStripWidth(Math.max(MIN_PAGE_STRIP_WIDTH, Math.min(maxWidth, nextWidth)));
    }

    stripResizeCleanupRef.current = stopResizing;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', stopResizing);
    window.addEventListener('blur', stopResizing);
  }

  async function handleFiles(incoming: File[]) {
    await addFiles(incoming);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    void handleFiles(Array.from(event.dataTransfer.files));
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    void handleFiles(Array.from(event.target.files ?? []));
    event.target.value = '';
  }

  if (!selectedFile) {
    return (
      <div className="upload-page" onDrop={handleDrop} onDragOver={(event) => event.preventDefault()}>
        <input
          ref={inputRef}
          id="document-upload-input"
          type="file"
          accept=".md,.markdown,text/markdown"
          onChange={handleChange}
          style={{ display: 'none' }}
        />

        <header className="upload-header">
          <button className="back-btn" onClick={onBack}>{messages.document.back}</button>
          <div className="document-upload-title">{messages.document.title}</div>
          <span className="tool-badge">MD</span>
        </header>

        <button
          type="button"
          className="upload-dropzone"
          onClick={() => inputRef.current?.click()}
        >
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
            <strong className="upload-heading">{messages.document.dropTitle}</strong>
            <span className="upload-sub">{messages.document.dropDescription}</span>
            <span className="upload-hint">MD</span>
          </div>
        </button>
        {error ? <p className="error-msg">{error.message}</p> : null}
      </div>
    );
  }

  const workspaceStyle = {
    '--doc-strip-width': `${pageStripWidth}px`,
    '--doc-thumb-scale': `${Math.max(0.11, Math.min(0.35, (pageStripWidth - 4) / 793))}`,
  } as CSSProperties;

  return (
    <div className="document-page" onDrop={handleDrop} onDragOver={(event) => event.preventDefault()}>
      <input
        ref={inputRef}
        type="file"
        accept=".md,.markdown,text/markdown"
        style={{ display: 'none' }}
        onChange={handleChange}
      />

      <header className="edit-header">
        <button className="back-btn" onClick={onBack}>{messages.document.backHome}</button>
        <div className="document-header-copy">
          <strong>{messages.document.title}</strong>
        </div>
        <button className="add-more-btn" onClick={() => inputRef.current?.click()}>
          {messages.document.replaceFile}
        </button>
      </header>

      <div className="document-workspace" ref={workspaceRef} style={workspaceStyle}>
        {/* Left: page strip */}
        <aside className="doc-page-strip">
          {pageCount > 0
            ? Array.from({ length: pageCount }, (_, i) => (
                <div
                  key={i}
                  className={`doc-page-entry ${activePage === i ? 'is-active' : ''}`}
                >
                  <button
                    className={`doc-page-item ${activePage === i ? 'is-active' : ''}`}
                    onClick={() => scrollToPage(i)}
                    title={formatPageLabel(locale, i)}
                    type="button"
                  >
                    {pageThumbs.pages[i] ? (
                      <div className="doc-page-thumb">
                        <iframe
                          className="doc-page-thumb-frame"
                          srcDoc={`<!doctype html><html><head>${pageThumbs.headHtml}<style>html,body{margin:0;padding:0;overflow:hidden;background:white;}</style></head><body>${pageThumbs.pages[i]}</body></html>`}
                          sandbox="allow-same-origin"
                          title={formatPagePreviewLabel(locale, i)}
                        />
                      </div>
                    ) : (
                      <span className="doc-page-thumb-empty" />
                    )}
                  </button>
                  <span className="doc-page-item-num">{i + 1}</span>
                </div>
              ))
            : null}
        </aside>
        <div className="doc-strip-divider" onMouseDown={handleStripDividerMouseDown} />

        {/* Center: preview */}
        <section className="document-preview panel-surface">
          {previewHtml ? (
            <iframe
              ref={iframeRef}
              title={messages.document.previewFrameTitle}
              srcDoc={previewHtml}
              sandbox="allow-scripts"
              className="document-preview-frame"
            />
          ) : (
            <div className="document-preview-empty">
              <strong>{selectedFile.file.name}</strong>
              <span>{isProcessing ? messages.document.previewLoading : messages.document.previewFailed}</span>
            </div>
          )}
          <div className="document-preview-meta">
            <span>{selectedFile.file.name}</span>
            <span>{bytesToHuman(selectedFile.file.size)}</span>
            <span>MD</span>
            {pageCount > 0 && <span>{formatPageCount(locale, pageCount)}</span>}
          </div>
          {error ? <p className="error-msg">{error.message}</p> : null}
          {isProcessing ? (
            <div className="progress-wrap document-progress">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <span className="progress-label">{progress}%</span>
            </div>
          ) : null}
        </section>

        {/* Right: options */}
        <aside className="options-panel">
          <div className="options-scroll">
            <h3 className="panel-title">{messages.document.exportTitle}</h3>
            <div className="document-option-card"><strong>{messages.document.fileName}</strong><p>{selectedFile.file.name}</p></div>
            <div className="document-option-card">
              <strong>{messages.document.titlePosition}</strong>
              <label className="document-select-field">
                <select
                  className="document-select"
                  value={options.titlePosition}
                  onChange={(event) => void updateOptions({ titlePosition: event.target.value as 'header' | 'footer' | 'none' })}
                >
                  <option value="none">{messages.document.hidden}</option>
                  <option value="header">{messages.document.header}</option>
                  <option value="footer">{messages.document.footer}</option>
                </select>
              </label>
            </div>
            <div className="document-option-card">
              <strong>{messages.document.pageNumbers}</strong>
              <label className="document-select-field">
                <select
                  className="document-select"
                  value={options.pageNumberFormat}
                  onChange={(event) => void updateOptions({ pageNumberFormat: event.target.value as 'none' | 'page-n' | 'n-of-total' | 'n' })}
                >
                  <option value="none">{messages.document.hidden}</option>
                  <option value="page-n">{messages.document.pageNumberExample}</option>
                  <option value="n-of-total">1/5, 2/5…</option>
                  <option value="n">1, 2, 3…</option>
                </select>
              </label>
            </div>
            <div className="document-option-card">
              <strong>{messages.document.dateLabel}</strong>
              <label className="document-select-field">
                <select
                  className="document-select"
                  value={options.showDateInFooter ? 'show' : 'none'}
                  onChange={(event) => void updateOptions({ showDateInFooter: event.target.value === 'show' })}
                >
                  <option value="none">{messages.document.hidden}</option>
                  <option value="show">{messages.document.show}</option>
                </select>
              </label>
            </div>
            <div className="document-option-card">
              <strong>{messages.document.bodyScale}</strong>
              <div className="doc-scale-row">
                <input
                  type="range"
                  className="range-input"
                  min={70}
                  max={130}
                  step={5}
                  value={options.contentScale}
                  onChange={(event) => void updateOptions({ contentScale: Number(event.target.value) })}
                />
                <span className="doc-scale-label">{options.contentScale}%</span>
              </div>
            </div>
          </div>
          <div className="panel-actions">
            <button className="process-btn" onClick={() => printDocument()} disabled={isProcessing || !previewHtml}>
              {isProcessing ? messages.document.savePreparing : messages.document.save}
            </button>
            <button className="re-edit-btn" onClick={() => removeFile(selectedFile.id)}>
              {messages.document.removeFile}
            </button>
          </div>
        </aside>
      </div>

    </div>
  );
}
