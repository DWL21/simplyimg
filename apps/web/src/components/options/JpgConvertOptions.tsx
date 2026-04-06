import { appMessages } from '../../i18n/messages';

interface JpgConvertOptionsProps {
  quality: number;
  onQualityChange: (quality: number) => void;
}

export function JpgConvertOptions({ quality, onQualityChange }: JpgConvertOptionsProps) {
  return (
    <div className="option-stack">
      <div className="option-group">
        <div className="option-copy">
          <strong>{appMessages.options.convert.outputTitle}</strong>
          <p>{appMessages.options.convert.outputDescription}</p>
        </div>
        <div className="format-lockup">
          <span className="format-pill">{appMessages.options.convert.input}</span>
          <strong>PNG, WEBP, GIF, JPG</strong>
          <span className="format-arrow">→</span>
          <span className="format-pill is-output">{appMessages.options.convert.output}</span>
          <strong>JPG</strong>
        </div>
      </div>

      <div className="option-group">
        <div className="option-copy">
          <strong>{appMessages.options.convert.qualityTitle}</strong>
          <p>{appMessages.options.convert.qualityDescription}</p>
        </div>
        <div className="range-panel">
          <div className="range-header">
            <span>{appMessages.options.convert.quality}</span>
            <strong>{quality}</strong>
          </div>
          <input
            className="range-input"
            type="range"
            min={40}
            max={95}
            step={1}
            value={quality}
            onChange={(event) => onQualityChange(Number(event.target.value))}
          />
        </div>
      </div>
    </div>
  );
}
