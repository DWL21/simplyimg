import { useState } from 'react';
import { normalizeMarkdownFileName } from '../lib/markdownFiles';
import { useI18n } from '../i18n/messages';

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
  const [fileName, setFileName] = useState(() => messages.markdownEditor.fileNamePlaceholder);
  const [markdown, setMarkdown] = useState('');
  const [isOpeningPdf, setIsOpeningPdf] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleOpenPdf() {
    setIsOpeningPdf(true);
    setErrorMessage(null);

    try {
      await onOpenPdf(markdown, fileName);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : locale === 'ko'
            ? 'Markdown 초안을 열지 못했습니다.'
            : 'Failed to open the Markdown draft.',
      );
      setIsOpeningPdf(false);
    }
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
          <label className="markdown-editor-field">
            <span className="markdown-editor-label">{messages.markdownEditor.fileNameLabel}</span>
            <input
              className="markdown-editor-input"
              type="text"
              value={fileName}
              onChange={(event) => setFileName(event.target.value)}
              placeholder={messages.markdownEditor.fileNamePlaceholder}
              spellCheck={false}
            />
          </label>

          <label className="markdown-editor-field markdown-editor-field-grow">
            <span className="markdown-editor-label">{messages.markdownEditor.sourceLabel}</span>
            <textarea
              className="markdown-editor-textarea"
              value={markdown}
              onChange={(event) => setMarkdown(event.target.value)}
              placeholder={messages.markdownEditor.sourcePlaceholder}
              spellCheck={false}
            />
          </label>

          {errorMessage ? <p className="error-msg">{errorMessage}</p> : null}

          <div className="markdown-editor-actions">
            <button
              type="button"
              className="re-edit-btn"
              onClick={() => downloadMarkdown(markdown, fileName)}
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
