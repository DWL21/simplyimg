import { useLocaleMessages } from '../../i18n/messages';

interface ImagePreviewProps {
  src?: string;
  alt: string;
  caption?: string;
  emptyLabel?: string;
}

export function ImagePreview({ src, alt, caption, emptyLabel }: ImagePreviewProps) {
  const messages = useLocaleMessages();

  return (
    <div className="preview-box">
      <div className="preview-frame">
        {src ? (
          <img className="preview-image" src={src} alt={alt} />
        ) : (
          <div className="preview-empty">{emptyLabel ?? messages.imagePreview.empty}</div>
        )}
      </div>
      {caption ? <span className="muted">{caption}</span> : null}
    </div>
  );
}
