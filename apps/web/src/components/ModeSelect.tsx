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
  onSelect: (tool: ToolName) => void;
}

export default function ModeSelect({ onSelect }: Props) {
  return (
    <div className="select-page">
      <header className="select-header">
        <Brand />
      </header>

      <div className="select-hero">
        <p className="select-eyebrow">무료 · 브라우저에서 처리 · 개인정보 보호</p>
        <h1 className="select-title">
          어떤 작업을<br />하실 건가요?
        </h1>
      </div>

      <div className="mode-grid">
        {ALL_TOOLS.map((id) => (
          <button key={id} className="mode-card" onClick={() => onSelect(id)}>
            <span className="mode-icon">{TOOL_ICONS[id]}</span>
            <div className="mode-copy">
              <strong>{TOOL_LABELS[id]}</strong>
              <p>{TOOL_DESCS[id]}</p>
            </div>
            <span className="mode-arrow">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}
