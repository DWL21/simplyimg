interface CanvasControlsProps {
  zoom: number;
  alignLabel: string;
  zoomInLabel: string;
  zoomOutLabel: string;
  onAlign: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function CanvasControls({
  zoom,
  alignLabel,
  zoomInLabel,
  zoomOutLabel,
  onAlign,
  onZoomIn,
  onZoomOut,
}: CanvasControlsProps) {
  return (
    <div className="canvas-controls">
      <button
        type="button"
        className="canvas-action-btn"
        onClick={onAlign}
      >
        {alignLabel}
      </button>

      <div className="zoom-controls">
        <button
          className="zoom-btn"
          onClick={onZoomOut}
          title={zoomOutLabel}
          aria-label={zoomOutLabel}
          type="button"
        >
          -
        </button>
        <div className="zoom-value" aria-live="polite">
          {Math.round(zoom * 100)}%
        </div>
        <button
          className="zoom-btn"
          onClick={onZoomIn}
          title={zoomInLabel}
          aria-label={zoomInLabel}
          type="button"
        >
          +
        </button>
      </div>
    </div>
  );
}
