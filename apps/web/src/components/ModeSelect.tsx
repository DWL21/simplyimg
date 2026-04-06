import type { ToolName } from '../types/image';
import { TOOL_LABELS, ALL_TOOLS } from '../lib/toolConstants';
import Brand from './Brand';

const TOOL_DESCS: Record<ToolName, string> = {
  compress: '파일 크기를 줄이고 품질을 최적화합니다',
  resize: '가로/세로 픽셀 크기를 바꿉니다',
  convert: 'JPEG · PNG · WebP · GIF로 변환합니다',
  crop: '드래그로 원하는 영역을 선택합니다',
  rotate: '90° · 180° · 270° 방향을 바꿉니다',
  flip: '좌우 또는 상하로 뒤집습니다',
};

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
  return (
    <div className="select-page">
      <header className="select-header">
        <Brand />
      </header>

      <div className="select-hero">
        <h1 className="select-title">
          이미지 작업은 그대로 두고<br />문서 작업 섹션을 추가했습니다.
        </h1>
      </div>

      <section className="mode-section">
        <div className="mode-section-head">
          <div>
            <span className="mode-section-label">IMAGE</span>
            <h2>이미지 섹션</h2>
            <p>기존 구현은 이 섹션으로 묶고 그대로 유지합니다.</p>
          </div>
        </div>
        <div className="mode-grid">
          {ALL_TOOLS.map((id) => (
            <button key={id} className="mode-card" onClick={() => onSelectImage(id)}>
              <span className="mode-icon">{TOOL_ICONS[id]}</span>
              <div className="mode-copy">
                <strong>{TOOL_LABELS[id]}</strong>
                <p>{TOOL_DESCS[id]}</p>
              </div>
              <span className="mode-arrow">→</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mode-section">
        <div className="mode-section-head">
          <div>
            <span className="mode-section-label">DOCUMENT</span>
            <h2>문서 섹션</h2>
            <p>md, docx 문서를 PDF로 변환하는 새 흐름입니다.</p>
          </div>
        </div>
        <div className="mode-grid mode-grid-single">
          <button className="mode-card mode-card-document" onClick={onSelectDocument}>
            <span className="mode-icon">PDF</span>
            <div className="mode-copy">
              <strong>문서를 PDF로 변환</strong>
              <p>Markdown과 Word 문서를 업로드해서 PDF로 일괄 변환합니다.</p>
            </div>
            <span className="mode-arrow">→</span>
          </button>
        </div>
      </section>
    </div>
  );
}
