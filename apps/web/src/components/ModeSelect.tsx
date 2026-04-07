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
}

export default function ModeSelect({ onSelectImage, onSelectDocument }: Props) {
  const { locale, messages } = useI18n();

  return (
    <div className="select-page">
      <div className="select-main">
        <div className="select-hero">
          <div className="select-signature" aria-label={messages.brand.name}>
            <img
              className="select-signature-mark"
              src="/favicon.svg"
              alt={messages.brand.name}
              width="64"
              height="64"
            />
            <div className="select-signature-copy">
              <strong>{messages.brand.name}</strong>
              <span>{messages.brand.tagline}</span>
            </div>
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
            </div>
          </div>
          <div className="mode-grid mode-grid-single">
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
