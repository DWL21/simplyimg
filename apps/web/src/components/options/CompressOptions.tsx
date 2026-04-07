import { appMessages } from '../../i18n/messages';

interface CompressOptionsProps {
  quality: number;
  format?: 'jpeg' | 'png' | 'webp';
  onQualityChange: (quality: number) => void;
  onFormatChange: (format: 'jpeg' | 'png' | 'webp' | undefined) => void;
}

export function CompressOptions({
  quality,
  format,
  onQualityChange,
  onFormatChange,
}: CompressOptionsProps) {
  return (
    <div className="option-stack">
      <div className="option-group">
        <div className="option-copy">
          <strong>{appMessages.options.compress.strengthTitle}</strong>
          <p>{appMessages.options.compress.strengthDescription}</p>
        </div>
        <div className="range-panel">
          <div className="range-header">
            <span>{appMessages.options.compress.quality}</span>
            <strong>{quality}</strong>
          </div>
          <input
            className="range-input"
            type="range"
            min={20}
            max={95}
            step={1}
            value={quality}
            onChange={(event) => onQualityChange(Number(event.target.value))}
          />
          <div className="segmented-hint">
            <span>{appMessages.options.compress.highCompression}</span>
            <span>{appMessages.options.compress.balanced}</span>
            <span>{appMessages.options.compress.highQuality}</span>
          </div>
        </div>
      </div>

      <div className="option-group">
        <div className="option-copy">
          <strong>{appMessages.options.compress.outputFormatTitle}</strong>
          <p>{appMessages.options.compress.outputFormatDescription}</p>
        </div>
        <div className="segmented-control">
          {([undefined, 'jpeg', 'png', 'webp'] as const).map((value) => (
            <button
              key={value ?? 'original'}
              className={value === format ? 'segmented-option is-active' : 'segmented-option'}
              type="button"
              onClick={() => onFormatChange(value)}
            >
              {value ? value.toUpperCase() : '원본 유지'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
