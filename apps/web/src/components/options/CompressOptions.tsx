import { appMessages } from '../../i18n/messages';

interface CompressOptionsProps {
  quality: number;
  onQualityChange: (quality: number) => void;
}

export function CompressOptions({
  quality,
  onQualityChange,
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
    </div>
  );
}
