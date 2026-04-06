import type { ToolName, OutputFormat, FitMode, CropOptions } from '../types/image';

export interface OptionsPanelState {
  compress: { quality: number; format: OutputFormat | undefined };
  resize: { width: number; height: number; fit: FitMode };
  convert: { to: OutputFormat; quality: number };
  rotate: { degrees: 90 | 180 | 270 };
  flip: { horizontal: boolean };
  crop: CropOptions | null;
}

interface Props {
  tool: ToolName;
  state: OptionsPanelState;
  onChange: (state: OptionsPanelState) => void;
}

export default function OptionsPanel({ tool, state, onChange }: Props) {
  function patch<K extends keyof OptionsPanelState>(key: K, val: OptionsPanelState[K]) {
    onChange({ ...state, [key]: val });
  }

  if (tool === 'compress') {
    const s = state.compress;
    const formats: { label: string; value: OutputFormat | undefined }[] = [
      { label: '원본 유지', value: undefined },
      { label: 'JPEG', value: 'jpeg' },
      { label: 'PNG', value: 'png' },
      { label: 'WebP', value: 'webp' },
    ];
    return (
      <div className="opt-stack">
        <div className="opt-group">
          <div className="opt-row">
            <span>품질</span>
            <strong>{s.quality}%</strong>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={s.quality}
            onChange={(e) => patch('compress', { ...s, quality: +e.target.value })}
            className="slider"
          />
        </div>
        <div className="opt-group">
          <span className="opt-label">출력 형식</span>
          <div className="chip-row">
            {formats.map((f) => (
              <button
                key={String(f.value)}
                className={`chip ${s.format === f.value ? 'is-active' : ''}`}
                onClick={() => patch('compress', { ...s, format: f.value })}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (tool === 'resize') {
    const s = state.resize;
    const fits: { label: string; value: FitMode }[] = [
      { label: 'Contain', value: 'contain' },
      { label: 'Cover', value: 'cover' },
      { label: 'Exact', value: 'exact' },
    ];
    return (
      <div className="opt-stack">
        <div className="opt-group">
          <span className="opt-label">크기 (px)</span>
          <div className="size-row">
            <div className="field">
              <span>너비</span>
              <input
                type="number"
                value={s.width || ''}
                placeholder="1920"
                onChange={(e) => patch('resize', { ...s, width: +e.target.value })}
              />
            </div>
            <div className="field">
              <span>높이</span>
              <input
                type="number"
                value={s.height || ''}
                placeholder="1080"
                onChange={(e) => patch('resize', { ...s, height: +e.target.value })}
              />
            </div>
          </div>
        </div>
        <div className="opt-group">
          <span className="opt-label">채우기 방식</span>
          <div className="chip-row">
            {fits.map((f) => (
              <button
                key={f.value}
                className={`chip ${s.fit === f.value ? 'is-active' : ''}`}
                onClick={() => patch('resize', { ...s, fit: f.value })}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (tool === 'convert') {
    const s = state.convert;
    const formats: { label: string; value: OutputFormat }[] = [
      { label: 'JPEG', value: 'jpeg' },
      { label: 'PNG', value: 'png' },
      { label: 'WebP', value: 'webp' },
      { label: 'GIF', value: 'gif' },
    ];
    return (
      <div className="opt-stack">
        <div className="opt-group">
          <span className="opt-label">변환 형식</span>
          <div className="chip-row">
            {formats.map((f) => (
              <button
                key={f.value}
                className={`chip ${s.to === f.value ? 'is-active' : ''}`}
                onClick={() => patch('convert', { ...s, to: f.value })}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="opt-group">
          <div className="opt-row">
            <span>품질</span>
            <strong>{s.quality}%</strong>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={s.quality}
            onChange={(e) => patch('convert', { ...s, quality: +e.target.value })}
            className="slider"
          />
        </div>
      </div>
    );
  }

  if (tool === 'rotate') {
    const s = state.rotate;
    return (
      <div className="opt-group">
        <span className="opt-label">회전 각도</span>
        <div className="chip-row">
          {([90, 180, 270] as const).map((d) => (
            <button
              key={d}
              className={`chip ${s.degrees === d ? 'is-active' : ''}`}
              onClick={() => patch('rotate', { degrees: d })}
            >
              {d}°
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (tool === 'flip') {
    const s = state.flip;
    return (
      <div className="opt-group">
        <span className="opt-label">방향</span>
        <div className="chip-row">
          <button
            className={`chip ${s.horizontal ? 'is-active' : ''}`}
            onClick={() => patch('flip', { horizontal: true })}
          >
            좌우 반전
          </button>
          <button
            className={`chip ${!s.horizontal ? 'is-active' : ''}`}
            onClick={() => patch('flip', { horizontal: false })}
          >
            상하 반전
          </button>
        </div>
      </div>
    );
  }

  if (tool === 'crop') {
    const crop = state.crop;
    if (!crop) {
      return (
        <div className="crop-guide">
          <div className="crop-guide-icon">✂</div>
          <p>이미지 위에서 드래그하여<br />자를 영역을 선택하세요</p>
        </div>
      );
    }
    return (
      <div className="opt-group">
        <span className="opt-label">선택 영역</span>
        <div className="crop-stats">
          <div className="crop-stat">
            <span>X</span>
            <strong>{crop.x}px</strong>
          </div>
          <div className="crop-stat">
            <span>Y</span>
            <strong>{crop.y}px</strong>
          </div>
          <div className="crop-stat">
            <span>너비</span>
            <strong>{crop.width}px</strong>
          </div>
          <div className="crop-stat">
            <span>높이</span>
            <strong>{crop.height}px</strong>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
