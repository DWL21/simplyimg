import { useRef, type ChangeEvent } from 'react';
import { useI18n } from '../i18n/messages';
import { ALL_TOOLS, getToolDisplayLabel } from '../lib/toolConstants';
import type { ToolName } from '../types/image';
import { Footer } from './layout/Footer';

const TOOL_ICONS: Record<ToolName, string> = {
  compress: '⚡',
  resize: '⊹',
  convert: '⇄',
  crop: '⊞',
  rotate: '↺',
  flip: '⇅',
};

interface Props {
  onSelectImage: (tool: ToolName) => void;
  onSelectDocument: () => void;
  onSelectDocumentEditor: () => void;
  onOpenDocumentEditorFile: (file: File) => Promise<void>;
}

export default function ModeSelect({
  onSelectImage,
  onSelectDocument,
  onSelectDocumentEditor,
  onOpenDocumentEditorFile,
}: Props) {
  const { locale, messages } = useI18n();
  const markdownFileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleMarkdownFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    await onOpenDocumentEditorFile(file);
  }

  return (
    <div className="select-page">
      <div className="select-main">
        <div className="select-hero">
          <div className="select-signature" aria-label={messages.brand.name}>
            <img
              className="select-signature-mark"
              src="/favicon.svg"
              alt={messages.brand.name}
              width="112"
              height="112"
            />
          </div>
          <h1 className="select-title">{messages.modeSelect.title}</h1>
        </div>

        <section className="mode-section">
          <div className="mode-section-head">
            <div>
              <span className="mode-section-label">{messages.modeSelect.imageSectionLabel}</span>
              <h2>{messages.modeSelect.imageSectionTitle}</h2>
            </div>
          </div>
          <div className="mode-grid">
            {ALL_TOOLS.map((id) => (
              <button key={id} className="mode-card" onClick={() => onSelectImage(id)}>
                <span className="mode-icon">{TOOL_ICONS[id]}</span>
                <div className="mode-copy">
                  <strong>{getToolDisplayLabel(id, locale)}</strong>
                  <p>{messages.modeSelect.toolDescriptions[id]}</p>
                </div>
                <span className="mode-arrow">→</span>
              </button>
            ))}
          </div>
        </section>

        <section className="mode-section">
          <div className="mode-section-head">
            <div>
              <span className="mode-section-label">{messages.modeSelect.documentSectionLabel}</span>
              <h2>{messages.modeSelect.documentSectionTitle}</h2>
              <p>{messages.modeSelect.documentSectionDescription}</p>
            </div>
          </div>
          <input
            ref={markdownFileInputRef}
            type="file"
            accept=".md,.markdown,text/markdown"
            hidden
            onChange={(event) => void handleMarkdownFileChange(event)}
          />
          <div className="mode-grid">
            <button className="mode-card mode-card-document" onClick={onSelectDocumentEditor}>
              <span className="mode-icon">NEW</span>
              <div className="mode-copy">
                <strong>{messages.modeSelect.documentEditorTitle}</strong>
                <p>{messages.modeSelect.documentEditorDescription}</p>
              </div>
              <span className="mode-arrow">→</span>
            </button>
            <button
              className="mode-card mode-card-document"
              onClick={() => markdownFileInputRef.current?.click()}
            >
              <span className="mode-icon">EDIT</span>
              <div className="mode-copy">
                <strong>{messages.modeSelect.documentOpenTitle}</strong>
                <p>{messages.modeSelect.documentOpenDescription}</p>
              </div>
              <span className="mode-arrow">→</span>
            </button>
            <button className="mode-card mode-card-document" onClick={onSelectDocument}>
              <span className="mode-icon">PDF</span>
              <div className="mode-copy">
                <strong>{messages.modeSelect.documentToolTitle}</strong>
                <p>{messages.modeSelect.documentToolDescription}</p>
              </div>
              <span className="mode-arrow">→</span>
            </button>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
