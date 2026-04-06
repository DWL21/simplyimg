import { appMessages } from '../../i18n/messages';

interface ResizeOptionsProps {
  width: number;
  height: number;
  fit: 'contain' | 'cover' | 'exact';
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
  onFitChange: (fit: 'contain' | 'cover' | 'exact') => void;
}

const resizePresets = [
  { label: '1080 x 1080', width: 1080, height: 1080 },
  { label: '1280 x 720', width: 1280, height: 720 },
  { label: '1920 x 1080', width: 1920, height: 1080 },
];

export function ResizeOptions({
  width,
  height,
  fit,
  onWidthChange,
  onHeightChange,
  onFitChange,
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

      <div className="option-group">
        <div className="option-copy">
          <strong>{appMessages.options.resize.fitTitle}</strong>
          <p>{appMessages.options.resize.fitDescription}</p>
        </div>
        <div className="segmented-control">
          <button
            className={fit === 'contain' ? 'segmented-option is-active' : 'segmented-option'}
            type="button"
            onClick={() => onFitChange('contain')}
          >
            Contain
          </button>
          <button
            className={fit === 'cover' ? 'segmented-option is-active' : 'segmented-option'}
            type="button"
            onClick={() => onFitChange('cover')}
          >
            Cover
          </button>
          <button
            className={fit === 'exact' ? 'segmented-option is-active' : 'segmented-option'}
            type="button"
            onClick={() => onFitChange('exact')}
          >
            Exact
          </button>
        </div>
      </div>
    </div>
  );
}
