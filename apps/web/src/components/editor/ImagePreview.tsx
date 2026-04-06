interface ImagePreviewProps {
  src: string;
  alt: string;
  caption?: string;
}

export function ImagePreview({ src, alt, caption }: ImagePreviewProps) {
  return (
    <div className="preview-box">
      <img className="preview-image" src={src} alt={alt} />
      {caption ? <span className="muted">{caption}</span> : null}
    </div>
  );
}
