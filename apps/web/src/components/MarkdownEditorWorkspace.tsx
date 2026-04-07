import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/messages';
import { normalizeMarkdownFileName } from '../lib/markdownFiles';
import { renderMarkdownMarkup } from '../lib/markdownRenderer';
import { getErrorMessage } from '../lib/uiErrors';
import { useMarkdownEditorStore } from '../store/markdownEditorStore';

interface MarkdownEditorWorkspaceProps {
  entryMode: 'new' | 'edit';
  onBack: () => void;
  onOpenPdf: (markdown: string, fileName: string) => Promise<void>;
}

function downloadMarkdown(markdown: string, fileName: string) {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = normalizeMarkdownFileName(fileName);
  anchor.click();
  URL.revokeObjectURL(url);
}

function getScrollProgress(element: HTMLElement | null) {
  if (!element) {
    return 0;
  }

  const maxScrollTop = element.scrollHeight - element.clientHeight;
  if (maxScrollTop <= 0) {
    return 0;
  }

  return element.scrollTop / maxScrollTop;
}

function applyScrollProgress(element: HTMLElement | null, progress: number) {
  if (!element) {
    return;
  }

  const maxScrollTop = element.scrollHeight - element.clientHeight;
  if (maxScrollTop <= 0) {
    element.scrollTop = 0;
    return;
  }

  element.scrollTop = maxScrollTop * Math.max(0, Math.min(1, progress));
}

export default function MarkdownEditorWorkspace({
  entryMode,
  onBack,
  onOpenPdf,
}: MarkdownEditorWorkspaceProps) {
  const { locale, messages } = useI18n();
  const fileName = useMarkdownEditorStore((state) => state.fileName);
  const markdown = useMarkdownEditorStore((state) => state.markdown);
  const uploadError = useMarkdownEditorStore((state) => state.error);
  const loadFile = useMarkdownEditorStore((state) => state.loadFile);
  const setFileName = useMarkdownEditorStore((state) => state.setFileName);
  const setMarkdown = useMarkdownEditorStore((state) => state.setMarkdown);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [isOpeningPdf, setIsOpeningPdf] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [previewErrorMessage, setPreviewErrorMessage] = useState<string | null>(null);
  const [showFileImportScreen, setShowFileImportScreen] = useState(
    () => entryMode === 'edit' && !fileName.trim() && !markdown,
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const previewViewerRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollSyncRef = useRef(false);
  const scrollProgressRef = useRef(0);
  const lastRenderedPreviewMarkdownRef = useRef('');

  const resolvedFileName = fileName.trim() || messages.markdownEditor.fileNamePlaceholder;
  const errorMessage = actionErrorMessage ?? getErrorMessage(uploadError);
  const editorTitle = entryMode === 'edit'
    ? messages.modeSelect.documentOpenTitle
    : messages.markdownEditor.title;

  useEffect(() => {
    if (entryMode === 'edit') {
      setShowFileImportScreen(!fileName.trim() && !markdown);
      setViewMode('edit');
      return;
    }

    setShowFileImportScreen(false);
  }, [entryMode]);

  useEffect(() => {
    if (viewMode !== 'preview') {
      return;
    }

    if (!markdown.trim()) {
      lastRenderedPreviewMarkdownRef.current = '';
      setPreviewHtml('');
      setPreviewErrorMessage(null);
      setIsPreviewLoading(false);
      return;
    }

    let cancelled = false;
    setIsPreviewLoading(true);
    setPreviewErrorMessage(null);

    void renderMarkdownMarkup(markdown)
      .then((html) => {
        if (cancelled) {
          return;
        }

        lastRenderedPreviewMarkdownRef.current = markdown;
        setPreviewHtml(html);
        setIsPreviewLoading(false);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setPreviewHtml('');
        setPreviewErrorMessage(
          error instanceof Error && error.message
            ? error.message
            : messages.markdownEditor.previewFailed,
        );
        setIsPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [markdown, messages.markdownEditor.previewFailed, viewMode]);

  useEffect(() => {
    if (!pendingScrollSyncRef.current) {
      return;
    }

    const shouldWaitForPreviewRender = viewMode === 'preview'
      && Boolean(markdown.trim())
      && !previewErrorMessage
      && lastRenderedPreviewMarkdownRef.current !== markdown;

    if (shouldWaitForPreviewRender) {
      return;
    }

    const targetElement = viewMode === 'edit' ? textareaRef.current : previewViewerRef.current;
    if (!targetElement) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      applyScrollProgress(targetElement, scrollProgressRef.current);
      pendingScrollSyncRef.current = false;
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [markdown, previewErrorMessage, previewHtml, viewMode]);

  async function handleOpenPdf() {
    setIsOpeningPdf(true);
    setActionErrorMessage(null);

    try {
      await onOpenPdf(markdown, resolvedFileName);
    } catch (error) {
      setActionErrorMessage(
        error instanceof Error
          ? error.message
          : locale === 'ko'
            ? 'Markdown 초안을 열지 못했습니다.'
            : 'Failed to open the Markdown draft.',
      );
    } finally {
      setIsOpeningPdf(false);
    }
  }

  function handleViewModeToggle() {
    const activeElement = viewMode === 'edit' ? textareaRef.current : previewViewerRef.current;
    scrollProgressRef.current = getScrollProgress(activeElement);
    pendingScrollSyncRef.current = true;
    setActionErrorMessage(null);
    setPreviewErrorMessage(null);
    setViewMode((current) => current === 'edit' ? 'preview' : 'edit');
  }

  async function handleLoadFile(file: File | undefined) {
    if (!file) {
      return;
    }

    setActionErrorMessage(null);
    setPreviewErrorMessage(null);

    await loadFile(file);

    if (!useMarkdownEditorStore.getState().error) {
      setShowFileImportScreen(false);
      setViewMode('edit');
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    void handleLoadFile(event.dataTransfer.files?.[0]);
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    void handleLoadFile(file);
  }

  if (showFileImportScreen) {
    return (
      <div className="upload-page" onDrop={handleDrop} onDragOver={(event) => event.preventDefault()}>
        <input
          ref={fileInputRef}
          id="markdown-editor-upload-input"
          type="file"
          accept=".md,.markdown,text/markdown"
          onChange={handleChange}
          style={{ display: 'none' }}
        />

        <header className="upload-header">
          <button className="back-btn" onClick={onBack}>{messages.markdownEditor.backHome}</button>
          <div className="document-upload-title">{messages.modeSelect.documentOpenTitle}</div>
          <span className="tool-badge">MD</span>
        </header>

        <button
          type="button"
          className="upload-dropzone"
          onClick={() => fileInputRef.current?.click()}
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
        {errorMessage ? <p className="error-msg">{errorMessage}</p> : null}
      </div>
    );
  }

  return (
    <div className="markdown-editor-page">
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,text/markdown"
        style={{ display: 'none' }}
        onChange={handleChange}
      />

      <header className="edit-header">
        <button className="back-btn" onClick={onBack}>{messages.markdownEditor.backHome}</button>
        <div className="document-header-copy">
          <strong>{editorTitle}</strong>
        </div>
        {entryMode === 'edit' ? (
          <button className="add-more-btn" onClick={() => fileInputRef.current?.click()}>
            {messages.document.replaceFile}
          </button>
        ) : null}
      </header>

      <div className="markdown-editor-shell">
        <section className="markdown-editor-panel panel-surface">
          <div className="markdown-editor-toolbar">
            <div className="markdown-editor-toolbar-group">
              <button
                type="button"
                className="re-edit-btn markdown-editor-toolbar-btn markdown-editor-mode-toggle"
                onClick={handleViewModeToggle}
              >
                {viewMode === 'edit' ? messages.markdownEditor.preview : messages.markdownEditor.edit}
              </button>
            </div>
            <div className="markdown-editor-toolbar-group markdown-editor-toolbar-actions">
              <button
                type="button"
                className="re-edit-btn markdown-editor-toolbar-btn"
                onClick={() => {
                  setActionErrorMessage(null);
                  downloadMarkdown(markdown, resolvedFileName);
                }}
              >
                {messages.markdownEditor.saveMarkdown}
              </button>
              <button
                type="button"
                className="process-btn markdown-editor-toolbar-btn"
                onClick={() => void handleOpenPdf()}
                disabled={isOpeningPdf}
              >
                {isOpeningPdf ? messages.markdownEditor.openingPdf : messages.markdownEditor.savePdf}
              </button>
            </div>
          </div>

          <label className="markdown-editor-field">
            <span className="markdown-editor-label">{messages.markdownEditor.fileNameLabel}</span>
            <input
              className="markdown-editor-input"
              type="text"
              value={fileName}
              onChange={(event) => {
                setActionErrorMessage(null);
                setFileName(event.target.value);
              }}
              placeholder={messages.markdownEditor.fileNamePlaceholder}
              spellCheck={false}
            />
          </label>

          <div className="markdown-editor-field markdown-editor-field-grow">
            <span className="markdown-editor-label">
              {viewMode === 'edit' ? messages.markdownEditor.sourceLabel : messages.markdownEditor.preview}
            </span>
            {viewMode === 'edit' ? (
              <textarea
                ref={textareaRef}
                className="markdown-editor-textarea"
                value={markdown}
                onChange={(event) => {
                  setActionErrorMessage(null);
                  setPreviewErrorMessage(null);
                  setMarkdown(event.target.value);
                }}
                placeholder={messages.markdownEditor.sourcePlaceholder}
                spellCheck={false}
              />
            ) : (
              <div className="markdown-editor-view">
                {isPreviewLoading ? (
                  <div ref={previewViewerRef} className="markdown-editor-viewer is-empty">
                    <p>{messages.markdownEditor.previewLoading}</p>
                  </div>
                ) : previewErrorMessage ? (
                  <div ref={previewViewerRef} className="markdown-editor-viewer is-empty">
                    <p>{previewErrorMessage}</p>
                  </div>
                ) : !markdown.trim() ? (
                  <div ref={previewViewerRef} className="markdown-editor-viewer is-empty">
                    <p>{messages.markdownEditor.previewEmpty}</p>
                  </div>
                ) : (
                  <div ref={previewViewerRef} className="markdown-editor-viewer">
                    <article
                      className="markdown-viewer-body"
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {errorMessage ? <p className="error-msg">{errorMessage}</p> : null}
        </section>
      </div>
    </div>
  );
}
