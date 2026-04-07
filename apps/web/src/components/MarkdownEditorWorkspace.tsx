import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useI18n } from '../i18n/messages';
import { normalizeMarkdownFileName } from '../lib/markdownFiles';
import { renderMarkdownMarkup } from '../lib/markdownRenderer';
import { getErrorMessage } from '../lib/uiErrors';
import { useMarkdownEditorStore } from '../store/markdownEditorStore';

interface MarkdownEditorWorkspaceProps {
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

export default function MarkdownEditorWorkspace({ onBack, onOpenPdf }: MarkdownEditorWorkspaceProps) {
  const { locale, messages } = useI18n();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileName = useMarkdownEditorStore((state) => state.fileName);
  const markdown = useMarkdownEditorStore((state) => state.markdown);
  const uploadError = useMarkdownEditorStore((state) => state.error);
  const setFileName = useMarkdownEditorStore((state) => state.setFileName);
  const setMarkdown = useMarkdownEditorStore((state) => state.setMarkdown);
  const loadFile = useMarkdownEditorStore((state) => state.loadFile);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [isOpeningPdf, setIsOpeningPdf] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [previewErrorMessage, setPreviewErrorMessage] = useState<string | null>(null);

  const resolvedFileName = fileName.trim() || messages.markdownEditor.fileNamePlaceholder;
  const errorMessage = actionErrorMessage ?? getErrorMessage(uploadError);

  useEffect(() => {
    if (viewMode !== 'preview') {
      return;
    }

    if (!markdown.trim()) {
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

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setActionErrorMessage(null);
    setPreviewErrorMessage(null);
    setViewMode('edit');
    await loadFile(file);
  }

  return (
    <div className="markdown-editor-page">
      <header className="edit-header">
        <button className="back-btn" onClick={onBack}>{messages.markdownEditor.backHome}</button>
        <div className="document-header-copy">
          <strong>{messages.markdownEditor.title}</strong>
          <span>{messages.markdownEditor.openPdfDescription}</span>
        </div>
      </header>

      <div className="markdown-editor-shell">
        <section className="markdown-editor-panel panel-surface">
          <div className="markdown-editor-toolbar">
            <div className="markdown-editor-toolbar-group">
              <button
                type="button"
                className="re-edit-btn markdown-editor-toolbar-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                {messages.markdownEditor.openMarkdown}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.markdown,text/markdown"
                hidden
                onChange={(event) => void handleFileChange(event)}
              />
            </div>
            <div className="markdown-editor-toolbar-group">
              <button
                type="button"
                className="re-edit-btn markdown-editor-toolbar-btn"
                onClick={() => {
                  setActionErrorMessage(null);
                  setPreviewErrorMessage(null);
                  setViewMode((current) => current === 'edit' ? 'preview' : 'edit');
                }}
              >
                {viewMode === 'edit' ? messages.markdownEditor.preview : messages.markdownEditor.edit}
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
                  <div className="markdown-editor-viewer is-empty">
                    <p>{messages.markdownEditor.previewLoading}</p>
                  </div>
                ) : previewErrorMessage ? (
                  <div className="markdown-editor-viewer is-empty">
                    <p>{previewErrorMessage}</p>
                  </div>
                ) : !markdown.trim() ? (
                  <div className="markdown-editor-viewer is-empty">
                    <p>{messages.markdownEditor.previewEmpty}</p>
                  </div>
                ) : (
                  <div className="markdown-editor-viewer">
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

          <div className="markdown-editor-actions">
            <button
              type="button"
              className="re-edit-btn"
              onClick={() => {
                setActionErrorMessage(null);
                downloadMarkdown(markdown, resolvedFileName);
              }}
            >
              {messages.markdownEditor.saveMarkdown}
            </button>
            <button
              type="button"
              className="process-btn"
              onClick={() => void handleOpenPdf()}
              disabled={isOpeningPdf}
            >
              {isOpeningPdf ? messages.markdownEditor.openingPdf : messages.markdownEditor.savePdf}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
