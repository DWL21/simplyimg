import type { ToolName } from '../types/image';
import { Footer } from './layout/Footer';
import { TOOL_LABELS, ALL_TOOLS } from '../lib/toolConstants';

const TOOL_DESCS: Record<ToolName, string> = {
  compress: '파일 크기를 줄이고 품질을 최적화합니다',
  resize: '가로/세로 픽셀 크기를 바꿉니다',
  convert: 'JPEG · JPG · PNG · WebP · SVG를 지원합니다',
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
      <div className="select-hero">
        <h1 className="select-title">지금 필요한 작업을 바로 시작하세요</h1>
      </div>

      <section className="mode-section">
        <div className="mode-section-head">
          <div>
            <span className="mode-section-label">IMAGE</span>
            <h2>이미지 작업</h2>
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
            <h2>문서 작업</h2>
          </div>
        </div>
        <div className="mode-grid mode-grid-single">
          <button className="mode-card mode-card-document" onClick={onSelectDocument}>
            <span className="mode-icon">PDF</span>
            <div className="mode-copy">
              <strong>Markdown을 PDF로 변환</strong>
              <p>Markdown 파일을 PDF로 변환합니다.</p>
            </div>
            <span className="mode-arrow">→</span>
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
