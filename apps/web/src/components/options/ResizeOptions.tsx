import { appMessages } from '../../i18n/messages';

interface ResizeOptionsProps {
  width: number;
  height: number;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
}

const resizePresets = [
  { label: '1080 x 1080', width: 1080, height: 1080 },
  { label: '1280 x 720', width: 1280, height: 720 },
  { label: '1920 x 1080', width: 1920, height: 1080 },
];

export function ResizeOptions({
  width,
  height,
  onWidthChange,
  onHeightChange,
}: ResizeOptionsProps) {
  return (
    <div className="option-stack">
      <div className="option-group">
        <div className="option-copy">
          <strong>{appMessages.options.resize.sizeTitle}</strong>
          <p>{appMessages.options.resize.sizeDescription}</p>
        </div>
        <div className="size-grid">
          <label className="field">
            <span>{appMessages.options.resize.width}</span>
            <input type="number" min={1} value={width} onChange={(event) => onWidthChange(Number(event.target.value))} />
          </label>
          <label className="field">
            <span>{appMessages.options.resize.height}</span>
            <input type="number" min={1} value={height} onChange={(event) => onHeightChange(Number(event.target.value))} />
          </label>
        </div>
        <div className="preset-row">
          {resizePresets.map((preset) => (
            <button
              key={preset.label}
              className="preset-chip"
              type="button"
              onClick={() => {
                onWidthChange(preset.width);
                onHeightChange(preset.height);
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
