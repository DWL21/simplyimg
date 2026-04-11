import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { localeMessages, useI18n } from '../i18n/messages';
import { normalizeMarkdownFileName } from '../lib/markdownFiles';
import {
  type TextEditResult,
  computeCharCount,
  computeWordCount,
  handleAutoIndent,
  handleTabIndent,
  handleTabOutdent,
  insertAtLineStart,
  insertBlock,
  wrapSelection,
} from '../lib/markdownEditHelpers';
import { renderMarkdownMarkup } from '../lib/markdownRenderer';
import { getErrorMessage } from '../lib/uiErrors';
import { useMarkdownEditorStore } from '../store/markdownEditorStore';

/* ── Platform detection ── */

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
const MOD = isMac ? '⌘' : 'Ctrl';

/* ── Bilingual tooltip helper ── */

function bi(ko: string, en: string, shortcut?: string): string {
  const parts = [ko, en];
  if (shortcut) parts.push(shortcut);
  return parts.join(' · ');
}

/* ── Inline SVG icons (stroke-based, 18×18) ── */

const ICON_PROPS = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

const UNDO_ICON = (
  <svg {...ICON_PROPS}>
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
);

const REDO_ICON = (
  <svg {...ICON_PROPS}>
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
  </svg>
);

const BOLD_ICON = (
  <svg {...ICON_PROPS}>
    <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
    <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
  </svg>
);

const ITALIC_ICON = (
  <svg {...ICON_PROPS}>
    <line x1="19" y1="4" x2="10" y2="4" />
    <line x1="14" y1="20" x2="5" y2="20" />
    <line x1="15" y1="4" x2="9" y2="20" />
  </svg>
);

const STRIKETHROUGH_ICON = (
  <svg {...ICON_PROPS}>
    <line x1="4" y1="12" x2="20" y2="12" />
    <path d="M17.5 7.5c0-2-1.5-3.5-5.5-3.5S6.5 5.5 6.5 7.5c0 4 11 3 11 8 0 2.5-2 4-6 4s-6-1.5-6-4" />
  </svg>
);

const H1_ICON = (
  <svg {...ICON_PROPS}>
    <polyline points="4 6 4 18" />
    <polyline points="10 6 10 18" />
    <line x1="4" y1="12" x2="10" y2="12" />
    <path d="M15 16l3-10h1l3 10" />
    <line x1="16" y1="13" x2="21" y2="13" />
  </svg>
);

const H2_ICON = (
  <svg {...ICON_PROPS}>
    <polyline points="4 6 4 18" />
    <polyline points="10 6 10 18" />
    <line x1="4" y1="12" x2="10" y2="12" />
    <path d="M15 16a2 2 0 1 1 3 1.5L15 20h4" />
  </svg>
);

const H3_ICON = (
  <svg {...ICON_PROPS}>
    <polyline points="4 6 4 18" />
    <polyline points="10 6 10 18" />
    <line x1="4" y1="12" x2="10" y2="12" />
    <path d="M16 8h4l-2.5 3A2 2 0 1 1 18 16c-1.5 0-2.5-1-2.5-2" />
  </svg>
);

const UL_ICON = (
  <svg {...ICON_PROPS}>
    <line x1="9" y1="6" x2="20" y2="6" />
    <line x1="9" y1="12" x2="20" y2="12" />
    <line x1="9" y1="18" x2="20" y2="18" />
    <circle cx="5" cy="6" r="1" fill="currentColor" stroke="none" />
    <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="5" cy="18" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const OL_ICON = (
  <svg {...ICON_PROPS}>
    <line x1="10" y1="6" x2="20" y2="6" />
    <line x1="10" y1="12" x2="20" y2="12" />
    <line x1="10" y1="18" x2="20" y2="18" />
    <text x="3" y="8" fontSize="8" fill="currentColor" stroke="none" fontFamily="inherit" fontWeight="700">1</text>
    <text x="3" y="14" fontSize="8" fill="currentColor" stroke="none" fontFamily="inherit" fontWeight="700">2</text>
    <text x="3" y="20" fontSize="8" fill="currentColor" stroke="none" fontFamily="inherit" fontWeight="700">3</text>
  </svg>
);

const QUOTE_ICON = (
  <svg {...ICON_PROPS}>
    <path d="M3 7c2-2 4-2 6 0s4 2 6 0" />
    <path d="M3 17c2-2 4-2 6 0s4 2 6 0" />
    <line x1="9" y1="3" x2="9" y2="21" />
  </svg>
);

const CODE_ICON = (
  <svg {...ICON_PROPS}>
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

const CODE_BLOCK_ICON = (
  <svg {...ICON_PROPS}>
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
    <line x1="12" y1="4" x2="12" y2="20" opacity="0.3" />
  </svg>
);

const LINK_ICON = (
  <svg {...ICON_PROPS}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const IMAGE_ICON = (
  <svg {...ICON_PROPS}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const HR_ICON = (
  <svg {...ICON_PROPS}>
    <line x1="2" y1="12" x2="22" y2="12" strokeWidth={2.5} />
  </svg>
);

/* ── Helpers ── */

interface HistoryEntry {
  value: string;
  cursor: number;
}

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
  if (!element) return 0;
  const maxScrollTop = element.scrollHeight - element.clientHeight;
  return maxScrollTop <= 0 ? 0 : element.scrollTop / maxScrollTop;
}

function applyScrollProgress(element: HTMLElement | null, progress: number) {
  if (!element) return;
  const maxScrollTop = element.scrollHeight - element.clientHeight;
  element.scrollTop = maxScrollTop <= 0 ? 0 : maxScrollTop * Math.max(0, Math.min(1, progress));
}

function applyEditResult(
  textarea: HTMLTextAreaElement,
  result: TextEditResult,
  setMarkdown: (v: string) => void,
) {
  setMarkdown(result.value);
  requestAnimationFrame(() => {
    textarea.selectionStart = result.selectionStart;
    textarea.selectionEnd = result.selectionEnd;
    textarea.focus();
  });
}

/* ── Component ── */

export default function MarkdownEditorWorkspace({
  entryMode,
  onBack,
  onOpenPdf,
}: MarkdownEditorWorkspaceProps) {
  const { locale, messages } = useI18n();
  const fileName = useMarkdownEditorStore((s) => s.fileName);
  const markdown = useMarkdownEditorStore((s) => s.markdown);
  const uploadError = useMarkdownEditorStore((s) => s.error);
  const loadFile = useMarkdownEditorStore((s) => s.loadFile);
  const setFileName = useMarkdownEditorStore((s) => s.setFileName);
  const setMarkdown = useMarkdownEditorStore((s) => s.setMarkdown);

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

  /* ── Undo / Redo history (component-local refs) ── */

  const pastRef = useRef<HistoryEntry[]>([]);
  const futureRef = useRef<HistoryEntry[]>([]);

  const pushToHistory = useCallback(() => {
    const ta = textareaRef.current;
    const current = useMarkdownEditorStore.getState().markdown;
    const cursor = ta ? ta.selectionStart : current.length;
    pastRef.current.push({ value: current, cursor });
    if (pastRef.current.length > 200) pastRef.current.shift();
    futureRef.current = [];
  }, []);

  const handleUndo = useCallback(() => {
    if (pastRef.current.length === 0) return;
    const ta = textareaRef.current;
    const current = useMarkdownEditorStore.getState().markdown;
    const cursor = ta ? ta.selectionStart : current.length;
    futureRef.current.push({ value: current, cursor });
    const previous = pastRef.current.pop()!;
    setMarkdown(previous.value);
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (ta) {
        const pos = Math.min(previous.cursor, previous.value.length);
        ta.selectionStart = pos;
        ta.selectionEnd = pos;
        ta.focus();
      }
    });
  }, [setMarkdown]);

  const handleRedo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const ta = textareaRef.current;
    const current = useMarkdownEditorStore.getState().markdown;
    const cursor = ta ? ta.selectionStart : current.length;
    pastRef.current.push({ value: current, cursor });
    const next = futureRef.current.pop()!;
    setMarkdown(next.value);
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (ta) {
        const pos = Math.min(next.cursor, next.value.length);
        ta.selectionStart = pos;
        ta.selectionEnd = pos;
        ta.focus();
      }
    });
  }, [setMarkdown]);

  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

  /* ── Derived state ── */

  const resolvedFileName = fileName.trim() || messages.markdownEditor.fileNamePlaceholder;
  const errorMessage = actionErrorMessage ?? getErrorMessage(uploadError);
  const editorTitle = entryMode === 'edit'
    ? messages.modeSelect.documentOpenTitle
    : messages.markdownEditor.title;

  const wordCount = useMemo(() => computeWordCount(markdown), [markdown]);
  const charCount = useMemo(() => computeCharCount(markdown), [markdown]);

  /* Bilingual labels */
  const ko = localeMessages.ko.markdownEditor;
  const en = localeMessages.en.markdownEditor;
  const m = messages.markdownEditor;

  /* ── Scroll sync ── */

  useEffect(() => {
    if (!pendingScrollSyncRef.current) return;

    const shouldWait = viewMode === 'preview'
      && Boolean(markdown.trim())
      && !previewErrorMessage
      && lastRenderedPreviewMarkdownRef.current !== markdown;

    if (shouldWait) return;

    const target = viewMode === 'edit' ? textareaRef.current : previewViewerRef.current;
    if (!target) return;

    const frameId = requestAnimationFrame(() => {
      applyScrollProgress(target, scrollProgressRef.current);
      pendingScrollSyncRef.current = false;
    });
    return () => cancelAnimationFrame(frameId);
  }, [markdown, previewErrorMessage, previewHtml, viewMode]);

  /* ── Preview rendering ── */

  useEffect(() => {
    if (viewMode !== 'preview') return;

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
        if (cancelled) return;
        lastRenderedPreviewMarkdownRef.current = markdown;
        setPreviewHtml(html);
        setIsPreviewLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        setPreviewHtml('');
        setPreviewErrorMessage(
          error instanceof Error && error.message
            ? error.message
            : messages.markdownEditor.previewFailed,
        );
        setIsPreviewLoading(false);
      });

    return () => { cancelled = true; };
  }, [markdown, messages.markdownEditor.previewFailed, viewMode]);

  /* ── File import screen reset ── */

  useEffect(() => {
    if (entryMode === 'edit') {
      if (!fileName.trim() && !markdown) {
        setShowFileImportScreen(true);
        setViewMode('edit');
      }
    } else {
      setShowFileImportScreen(false);
    }
  }, [entryMode]);

  /* ── Handlers ── */

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

  function switchViewMode(next: 'edit' | 'preview') {
    if (next === viewMode) return;
    const active = viewMode === 'edit' ? textareaRef.current : previewViewerRef.current;
    scrollProgressRef.current = getScrollProgress(active);
    pendingScrollSyncRef.current = true;
    setActionErrorMessage(null);
    setPreviewErrorMessage(null);
    setViewMode(next);
  }

  async function handleLoadFile(file: File | undefined) {
    if (!file) return;
    setActionErrorMessage(null);
    setPreviewErrorMessage(null);
    await loadFile(file);
    if (!useMarkdownEditorStore.getState().error) {
      pastRef.current = [];
      futureRef.current = [];
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

  /* ── Format toolbar actions ── */

  const applyFormat = useCallback(
    (fn: (value: string, start: number, end: number) => TextEditResult) => {
      const ta = textareaRef.current;
      if (!ta) return;
      pushToHistory();
      setActionErrorMessage(null);
      setPreviewErrorMessage(null);
      const result = fn(ta.value, ta.selectionStart, ta.selectionEnd);
      setMarkdown(result.value);
      requestAnimationFrame(() => {
        ta.selectionStart = result.selectionStart;
        ta.selectionEnd = result.selectionEnd;
        ta.focus();
      });
    },
    [pushToHistory, setMarkdown],
  );

  const handleBold = useCallback(() => {
    applyFormat((v, s, e) => wrapSelection(v, s, e, '**', '**', 'bold'));
  }, [applyFormat]);

  const handleItalic = useCallback(() => {
    applyFormat((v, s, e) => wrapSelection(v, s, e, '*', '*', 'italic'));
  }, [applyFormat]);

  const handleStrikethrough = useCallback(() => {
    applyFormat((v, s, e) => wrapSelection(v, s, e, '~~', '~~', 'text'));
  }, [applyFormat]);

  const handleH1 = useCallback(() => {
    applyFormat((v, s, e) => insertAtLineStart(v, s, e, '# '));
  }, [applyFormat]);

  const handleH2 = useCallback(() => {
    applyFormat((v, s, e) => insertAtLineStart(v, s, e, '## '));
  }, [applyFormat]);

  const handleH3 = useCallback(() => {
    applyFormat((v, s, e) => insertAtLineStart(v, s, e, '### '));
  }, [applyFormat]);

  const handleUl = useCallback(() => {
    applyFormat((v, s, e) => insertAtLineStart(v, s, e, '- '));
  }, [applyFormat]);

  const handleOl = useCallback(() => {
    applyFormat((v, s, e) => insertAtLineStart(v, s, e, '1. '));
  }, [applyFormat]);

  const handleQuote = useCallback(() => {
    applyFormat((v, s, e) => insertAtLineStart(v, s, e, '> '));
  }, [applyFormat]);

  const handleInlineCode = useCallback(() => {
    applyFormat((v, s, e) => wrapSelection(v, s, e, '`', '`', 'code'));
  }, [applyFormat]);

  const handleCodeBlock = useCallback(() => {
    applyFormat((v, s, e) => insertBlock(v, s, e, '```\n', '\n```'));
  }, [applyFormat]);

  const handleLink = useCallback(() => {
    applyFormat((v, s, e) => wrapSelection(v, s, e, '[', '](url)', 'link text'));
  }, [applyFormat]);

  const handleImage = useCallback(() => {
    applyFormat((v, s, e) => insertBlock(v, s, e, '![alt](', 'url)'));
  }, [applyFormat]);

  const handleHr = useCallback(() => {
    applyFormat((v, s, e) => insertBlock(v, s, e, '---\n', ''));
  }, [applyFormat]);

  /* ── Keyboard handling ── */

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const ta = textareaRef.current;
      if (!ta) return;

      const mod = event.metaKey || event.ctrlKey;

      /* Undo / Redo */
      if (mod && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        handleUndo();
        return;
      }
      if (mod && event.key === 'z' && event.shiftKey) {
        event.preventDefault();
        handleRedo();
        return;
      }
      if (mod && event.key === 'y') {
        event.preventDefault();
        handleRedo();
        return;
      }

      /* Tab */
      if (event.key === 'Tab') {
        event.preventDefault();
        const fn = event.shiftKey ? handleTabOutdent : handleTabIndent;
        pushToHistory();
        applyEditResult(ta, fn(ta.value, ta.selectionStart, ta.selectionEnd), setMarkdown);
        return;
      }

      /* Auto-indent */
      if (event.key === 'Enter' && !event.shiftKey) {
        const result = handleAutoIndent(ta.value, ta.selectionStart, ta.selectionEnd);
        if (result) {
          event.preventDefault();
          pushToHistory();
          applyEditResult(ta, result, setMarkdown);
        }
        return;
      }

      /* Formatting shortcuts */
      if (mod && event.key === 'b') {
        event.preventDefault();
        handleBold();
      } else if (mod && event.key === 'i') {
        event.preventDefault();
        handleItalic();
      } else if (mod && event.key === 'k') {
        event.preventDefault();
        handleLink();
      }
    },
    [handleBold, handleItalic, handleLink, handleUndo, handleRedo, pushToHistory, setMarkdown],
  );

  /* ── Render: file import screen ── */

  if (showFileImportScreen) {
    return (
      <div className="upload-page" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
        <input
          ref={fileInputRef}
          id="markdown-editor-upload-input"
          type="file"
          accept=".md,.markdown,text/markdown"
          onChange={handleChange}
          style={{ display: 'none' }}
        />
        <header className="upload-header">
          <button className="back-btn" onClick={onBack}>{m.backHome}</button>
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

  /* ── Render: editor ── */

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
        <button className="back-btn" onClick={onBack}>{m.backHome}</button>
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
          {/* Action toolbar */}
          <div className="markdown-editor-toolbar">
            <div className="markdown-editor-toolbar-group">
              <div className="markdown-editor-view-tabs">
                <button
                  type="button"
                  className={`markdown-editor-view-tab${viewMode === 'edit' ? ' is-active' : ''}`}
                  onClick={() => switchViewMode('edit')}
                >
                  {locale === 'ko' ? m.edit : m.edit}
                </button>
                <button
                  type="button"
                  className={`markdown-editor-view-tab${viewMode === 'preview' ? ' is-active' : ''}`}
                  onClick={() => switchViewMode('preview')}
                >
                  {m.preview}
                </button>
              </div>
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
                {m.saveMarkdown}
              </button>
              <button
                type="button"
                className="process-btn markdown-editor-toolbar-btn"
                onClick={() => void handleOpenPdf()}
                disabled={isOpeningPdf}
              >
                {isOpeningPdf ? m.openingPdf : m.savePdf}
              </button>
            </div>
          </div>

          {/* Format toolbar — edit mode only */}
          {viewMode === 'edit' ? (
            <div className="markdown-format-toolbar">
              <button type="button" className="markdown-format-btn" title={bi(ko.undo, en.undo, `${MOD}Z`)} onClick={handleUndo} disabled={!canUndo}>{UNDO_ICON}</button>
              <button type="button" className="markdown-format-btn" title={bi(ko.redo, en.redo, `${MOD}⇧Z`)} onClick={handleRedo} disabled={!canRedo}>{REDO_ICON}</button>
              <span className="markdown-format-divider" />
              <button type="button" className="markdown-format-btn" title={bi(ko.bold, en.bold, `${MOD}B`)} onClick={handleBold}>{BOLD_ICON}</button>
              <button type="button" className="markdown-format-btn" title={bi(ko.italic, en.italic, `${MOD}I`)} onClick={handleItalic}>{ITALIC_ICON}</button>
              <button type="button" className="markdown-format-btn" title={bi(ko.strikethrough, en.strikethrough)} onClick={handleStrikethrough}>{STRIKETHROUGH_ICON}</button>
              <span className="markdown-format-divider" />
              <button type="button" className="markdown-format-btn" title={bi(ko.heading1, en.heading1)} onClick={handleH1}>{H1_ICON}</button>
              <button type="button" className="markdown-format-btn" title={bi(ko.heading2, en.heading2)} onClick={handleH2}>{H2_ICON}</button>
              <button type="button" className="markdown-format-btn" title={bi(ko.heading3, en.heading3)} onClick={handleH3}>{H3_ICON}</button>
              <span className="markdown-format-divider" />
              <button type="button" className="markdown-format-btn" title={bi(ko.unorderedList, en.unorderedList)} onClick={handleUl}>{UL_ICON}</button>
              <button type="button" className="markdown-format-btn" title={bi(ko.orderedList, en.orderedList)} onClick={handleOl}>{OL_ICON}</button>
              <button type="button" className="markdown-format-btn" title={bi(ko.quote, en.quote)} onClick={handleQuote}>{QUOTE_ICON}</button>
              <span className="markdown-format-divider" />
              <button type="button" className="markdown-format-btn" title={bi(ko.inlineCode, en.inlineCode)} onClick={handleInlineCode}>{CODE_ICON}</button>
              <button type="button" className="markdown-format-btn" title={bi(ko.codeBlock, en.codeBlock)} onClick={handleCodeBlock}>{CODE_BLOCK_ICON}</button>
              <span className="markdown-format-divider" />
              <button type="button" className="markdown-format-btn" title={bi(ko.link, en.link, `${MOD}K`)} onClick={handleLink}>{LINK_ICON}</button>
              <button type="button" className="markdown-format-btn" title={bi(ko.image, en.image)} onClick={handleImage}>{IMAGE_ICON}</button>
              <button type="button" className="markdown-format-btn" title={bi(ko.horizontalRule, en.horizontalRule)} onClick={handleHr}>{HR_ICON}</button>
            </div>
          ) : null}

          {/* File name */}
          <label className="markdown-editor-field">
            <span className="markdown-editor-label">{m.fileNameLabel}</span>
            <input
              className="markdown-editor-input"
              type="text"
              value={fileName}
              onChange={(e) => {
                setActionErrorMessage(null);
                setFileName(e.target.value);
              }}
              placeholder={m.fileNamePlaceholder}
              spellCheck={false}
            />
          </label>

          {/* Content */}
          <div className="markdown-editor-field markdown-editor-field-grow">
            <span className="markdown-editor-label">
              {viewMode === 'edit' ? m.sourceLabel : m.preview}
            </span>
            {viewMode === 'edit' ? (
              <textarea
                ref={textareaRef}
                className="markdown-editor-textarea"
                value={markdown}
                onChange={(e) => {
                  setActionErrorMessage(null);
                  setPreviewErrorMessage(null);
                  pushToHistory();
                  setMarkdown(e.target.value);
                }}
                onKeyDown={handleKeyDown}
                placeholder={m.sourcePlaceholder}
                spellCheck={false}
              />
            ) : (
              <div className="markdown-editor-view">
                {isPreviewLoading ? (
                  <div ref={previewViewerRef} className="markdown-editor-viewer is-empty">
                    <p>{m.previewLoading}</p>
                  </div>
                ) : previewErrorMessage ? (
                  <div ref={previewViewerRef} className="markdown-editor-viewer is-empty">
                    <p>{previewErrorMessage}</p>
                  </div>
                ) : !markdown.trim() ? (
                  <div ref={previewViewerRef} className="markdown-editor-viewer is-empty">
                    <p>{m.previewEmpty}</p>
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

          {/* Status bar */}
          <div className="markdown-editor-status-bar">
            <span>{m.wordCount} {wordCount.toLocaleString()}</span>
            <span>{m.charCount} {charCount.toLocaleString()}</span>
          </div>
        </section>
      </div>
    </div>
  );
}
