import type { ToolName, OutputFormat, CropOptions } from '../types/image';

export interface OptionsPanelState {
  compress: { quality: number; format: OutputFormat | undefined };
  resize: { width: number; height: number; crop?: CropOptions };
  convert: { to: OutputFormat; quality: number };
  rotate: { degrees: number };
  flip: { horizontal: boolean; vertical: boolean };
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

  function normalizeRotateDegrees(value: number) {
    if (!Number.isFinite(value)) {
      return 0;
    }

    const normalized = Math.round(value) % 360;
    return normalized < 0 ? normalized + 360 : normalized;
  }

  function rotateQuarter(current: number, delta: -90 | 90) {
    return normalizeRotateDegrees(current + delta);
  }

  if (tool === 'compress') {
    const s = state.compress;
    const formats: { label: string; value: OutputFormat }[] = [
      { label: 'JPEG', value: 'jpeg' },
      { label: 'JPG', value: 'jpg' },
      { label: 'PNG', value: 'png' },
      { label: 'WebP', value: 'webp' },
      { label: 'SVG', value: 'svg' },
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
                key={f.value}
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
    return (
      <div className="opt-stack">
        <div className="crop-guide">
          <div className="crop-guide-icon">↔</div>
          <p>이미지 위에서 프레임을 드래그해 위치를 옮기고<br />핸들을 끌어 크기를 조절하세요</p>
        </div>
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
      </div>
    );
  }

  if (tool === 'convert') {
    const s = state.convert;
    const formats: { label: string; value: OutputFormat }[] = [
      { label: 'JPEG', value: 'jpeg' },
      { label: 'JPG', value: 'jpg' },
      { label: 'PNG', value: 'png' },
      { label: 'WebP', value: 'webp' },
      { label: 'SVG', value: 'svg' },
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
      <div className="opt-stack">
        <div className="opt-group">
          <div className="opt-row">
            <span>회전 각도</span>
            <label className="angle-input">
              <input
                type="number"
                min={0}
                max={359}
                step={1}
                value={s.degrees}
                onChange={(e) => patch('rotate', { degrees: normalizeRotateDegrees(+e.target.value) })}
              />
              <strong>°</strong>
            </label>
          </div>
          <input
            type="range"
            min={0}
            max={359}
            step={1}
            value={s.degrees}
            onChange={(e) => patch('rotate', { degrees: normalizeRotateDegrees(+e.target.value) })}
            className="slider"
          />
          <div className="slider-scale">
            {[0, 90, 180, 270].map((value) => (
              <span key={value}>{value}°</span>
            ))}
          </div>
        </div>
        <div className="opt-group">
          <span className="opt-label">90도 단위 회전</span>
          <div className="chip-row">
            <button
              className="chip rotate-quick-btn"
              onClick={() => patch('rotate', { degrees: rotateQuarter(s.degrees, -90) })}
              aria-label="왼쪽으로 90도 회전"
              title="왼쪽으로 90도 회전"
            >
              <span className="rotate-quick-icon">⟲</span>
              <span className="rotate-quick-label">왼쪽</span>
            </button>
            <button
              className="chip rotate-quick-btn"
              onClick={() => patch('rotate', { degrees: rotateQuarter(s.degrees, 90) })}
              aria-label="오른쪽으로 90도 회전"
              title="오른쪽으로 90도 회전"
            >
              <span className="rotate-quick-icon">⟳</span>
              <span className="rotate-quick-label">오른쪽</span>
            </button>
          </div>
          <div className="chip-row">
            {[0, 90, 180, 270].map((value) => (
              <button
                key={value}
                className={`chip ${s.degrees === value ? 'is-active' : ''}`}
                onClick={() => patch('rotate', { degrees: value })}
              >
                {value}°
              </button>
            ))}
          </div>
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
            onClick={() => patch('flip', { ...s, horizontal: !s.horizontal })}
            aria-label="좌우 반전"
            title="좌우 반전"
          >
            ↔
          </button>
          <button
            className={`chip ${s.vertical ? 'is-active' : ''}`}
            onClick={() => patch('flip', { ...s, vertical: !s.vertical })}
            aria-label="상하 반전"
            title="상하 반전"
          >
            ↕
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
      <div className="opt-stack">
        <div className="opt-group">
          <span className="opt-label">위치</span>
          <div className="size-row">
            <div className="field">
              <span>X</span>
              <input
                type="number"
                min={0}
                value={crop.x}
                onChange={(e) => patch('crop', { ...crop, x: Math.max(0, +e.target.value) })}
              />
            </div>
            <div className="field">
              <span>Y</span>
              <input
                type="number"
                min={0}
                value={crop.y}
                onChange={(e) => patch('crop', { ...crop, y: Math.max(0, +e.target.value) })}
              />
            </div>
          </div>
        </div>
        <div className="opt-group">
          <span className="opt-label">크기</span>
          <div className="size-row">
            <div className="field">
              <span>너비</span>
              <input
                type="number"
                min={1}
                value={crop.width}
                onChange={(e) => patch('crop', { ...crop, width: Math.max(1, +e.target.value) })}
              />
            </div>
            <div className="field">
              <span>높이</span>
              <input
                type="number"
                min={1}
                value={crop.height}
                onChange={(e) => patch('crop', { ...crop, height: Math.max(1, +e.target.value) })}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
