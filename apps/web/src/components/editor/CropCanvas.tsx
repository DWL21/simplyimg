interface CropCanvasProps {
  src?: string;
}

export function CropCanvas({ src }: CropCanvasProps) {
  return (
    <div className="panel" style={{ minHeight: 320, display: 'grid', placeItems: 'center' }}>
      {src ? (
        <img className="preview-image" src={src} alt="Crop preview" />
      ) : (
        <p className="muted">Crop canvas placeholder for a future interactive selection UI.</p>
      )}
    </div>
  );
}
