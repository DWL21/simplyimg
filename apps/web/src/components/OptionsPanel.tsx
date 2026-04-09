import { useI18n } from '../i18n/messages';
import { bytesToHuman, inferMimeType } from '../lib/formatUtils';
import type { ToolName, OutputFormat, CropOptions } from '../types/image';

export interface OptionsPanelState {
  compress: { quality: number };
  resize: { width: number; height: number; crop?: CropOptions };
  convert: { to: OutputFormat; quality: number };
  rotate: { degrees: number };
  flip: { horizontal: boolean; vertical: boolean };
  crop: CropOptions | null;
}

interface Props {
  tool: ToolName;
  state: OptionsPanelState;
  selectedFile?: File;
  onChange: (state: OptionsPanelState) => void;
}

function estimateCompressedSize(file: File, quality: number) {
  const mimeType = inferMimeType(file);
  const normalizedQuality = Math.max(1, Math.min(100, Math.round(quality))) / 100;

  let estimatedRatio: number;

  switch (mimeType) {
    case 'image/jpeg':
      estimatedRatio = 0.16 + Math.pow(normalizedQuality, 1.35) * 0.84;
      break;
    case 'image/webp':
      estimatedRatio = 0.1 + Math.pow(normalizedQuality, 1.2) * 0.78;
      break;
    case 'image/png':
      estimatedRatio = 0.62 + normalizedQuality * 0.28;
      break;
    case 'image/svg+xml':
      estimatedRatio = 0.4 + normalizedQuality * 0.35;
      break;
    case 'image/gif':
      estimatedRatio = 0.55 + normalizedQuality * 0.25;
      break;
    case 'image/heic':
    case 'image/heif':
      estimatedRatio = 0.58 + normalizedQuality * 0.27;
      break;
    default:
      estimatedRatio = 0.45 + normalizedQuality * 0.4;
      break;
  }

  const estimatedSize = Math.max(1, Math.round(file.size * Math.min(1, estimatedRatio)));
  const savedBytes = Math.max(0, file.size - estimatedSize);
  const savedPercent = file.size > 0 ? Math.round((savedBytes / file.size) * 100) : 0;

  return {
    estimatedSize,
    savedBytes,
    savedPercent,
  };
}

export default function OptionsPanel({ tool, state, selectedFile, onChange }: Props) {
  const { locale, messages } = useI18n();

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
    const compressionEstimate = selectedFile ? estimateCompressedSize(selectedFile, s.quality) : null;
    return (
      <div className="opt-stack">
        <div className="opt-group">
          <div className="opt-row">
            <span>{messages.options.compress.quality}</span>
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
          {selectedFile && compressionEstimate ? (
            <div className="compress-estimate">
              <div className="compress-estimate-row">
                <span>{locale === 'ko' ? '현재 용량' : 'Current size'}</span>
                <strong>{bytesToHuman(selectedFile.size)}</strong>
              </div>
              <div className="compress-estimate-row">
                <span>{locale === 'ko' ? '예상 용량' : 'Estimated size'}</span>
                <strong>{bytesToHuman(compressionEstimate.estimatedSize)}</strong>
              </div>
              <div className="compress-estimate-row">
                <span>{locale === 'ko' ? '예상 절감' : 'Estimated savings'}</span>
                <strong>
                  {bytesToHuman(compressionEstimate.savedBytes)}
                  {' '}
                  ({compressionEstimate.savedPercent}%)
                </strong>
              </div>
              <p className="compress-estimate-note">
                {locale === 'ko'
                  ? '슬라이더 값 기준의 예상치이며 실제 결과는 이미지 형식과 내용에 따라 달라질 수 있습니다.'
                  : 'This is an estimate based on the slider value. Actual results depend on image format and content.'}
              </p>
            </div>
          ) : null}
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
          <p>
            {locale === 'ko'
              ? '이미지 위에서 프레임을 드래그해 위치를 옮기고 핸들을 끌어 크기를 조절하세요'
              : 'Drag the frame on the image to reposition it, then drag the handles to resize it'}
          </p>
        </div>
        <div className="opt-group">
          <span className="opt-label">
            {locale === 'ko' ? '크기 (px)' : 'Size (px)'}
          </span>
          <div className="size-row">
            <div className="field">
              <span>{messages.options.resize.width}</span>
              <input
                type="number"
                value={s.width || ''}
                placeholder="1920"
                onChange={(e) => patch('resize', { ...s, width: +e.target.value })}
              />
            </div>
            <div className="field">
              <span>{messages.options.resize.height}</span>
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
          <span className="opt-label">{messages.options.convert.outputTitle}</span>
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
            <span>{messages.options.convert.quality}</span>
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
            <span>{locale === 'ko' ? '회전 각도' : 'Rotation angle'}</span>
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
          <span className="opt-label">{locale === 'ko' ? '90도 단위 회전' : 'Rotate by 90°'}</span>
          <div className="chip-row">
            <button
              className="chip rotate-quick-btn"
              onClick={() => patch('rotate', { degrees: rotateQuarter(s.degrees, -90) })}
              aria-label={locale === 'ko' ? '왼쪽으로 90도 회전' : 'Rotate 90° left'}
              title={locale === 'ko' ? '왼쪽으로 90도 회전' : 'Rotate 90° left'}
            >
              <span className="rotate-quick-icon">⟲</span>
              <span className="rotate-quick-label">{locale === 'ko' ? '왼쪽' : 'Left'}</span>
            </button>
            <button
              className="chip rotate-quick-btn"
              onClick={() => patch('rotate', { degrees: rotateQuarter(s.degrees, 90) })}
              aria-label={locale === 'ko' ? '오른쪽으로 90도 회전' : 'Rotate 90° right'}
              title={locale === 'ko' ? '오른쪽으로 90도 회전' : 'Rotate 90° right'}
            >
              <span className="rotate-quick-icon">⟳</span>
              <span className="rotate-quick-label">{locale === 'ko' ? '오른쪽' : 'Right'}</span>
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
        <span className="opt-label">{locale === 'ko' ? '방향' : 'Direction'}</span>
        <div className="chip-row">
          <button
            className={`chip ${s.horizontal ? 'is-active' : ''}`}
            onClick={() => patch('flip', { ...s, horizontal: !s.horizontal })}
            aria-label={locale === 'ko' ? '좌우 반전' : 'Flip horizontally'}
            title={locale === 'ko' ? '좌우 반전' : 'Flip horizontally'}
          >
            ↔
          </button>
          <button
            className={`chip ${s.vertical ? 'is-active' : ''}`}
            onClick={() => patch('flip', { ...s, vertical: !s.vertical })}
            aria-label={locale === 'ko' ? '상하 반전' : 'Flip vertically'}
            title={locale === 'ko' ? '상하 반전' : 'Flip vertically'}
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
          <p>
            {locale === 'ko'
              ? '이미지 위에서 드래그하여 자를 영역을 선택하세요'
              : 'Drag on the image to choose the area to crop'}
          </p>
        </div>
      );
    }
    return (
      <div className="opt-stack">
        <div className="opt-group">
          <span className="opt-label">{locale === 'ko' ? '위치' : 'Position'}</span>
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
          <span className="opt-label">{locale === 'ko' ? '크기' : 'Size'}</span>
          <div className="size-row">
            <div className="field">
              <span>{messages.options.resize.width}</span>
              <input
                type="number"
                min={1}
                value={crop.width}
                onChange={(e) => patch('crop', { ...crop, width: Math.max(1, +e.target.value) })}
              />
            </div>
            <div className="field">
              <span>{messages.options.resize.height}</span>
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
