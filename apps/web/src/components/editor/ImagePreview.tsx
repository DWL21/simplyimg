interface ImagePreviewProps {
  src?: string;
  alt: string;
  caption?: string;
  emptyLabel?: string;
}

export function ImagePreview({ src, alt, caption, emptyLabel }: ImagePreviewProps) {
  return (
    <div className="preview-box">
      <div className="preview-frame">
        {src ? (
          <img className="preview-image" src={src} alt={alt} />
        ) : (
          <div className="preview-empty">{emptyLabel ?? '표시할 이미지가 없습니다.'}</div>
        )}
      </div>
      {caption ? <span className="muted">{caption}</span> : null}
    </div>
  );
}
