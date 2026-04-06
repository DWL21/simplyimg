import { useDropZone } from '../../hooks/useDropZone';
import { appMessages } from '../../i18n/messages';
import { acceptedImageInput } from '../../lib/formatUtils';

interface DropZoneProps {
  onFiles: (files: File[]) => void;
}

export function DropZone({ onFiles }: DropZoneProps) {
  const zone = useDropZone(onFiles);

  return (
    <label className="dropzone" {...zone}>
      <input
        type="file"
        multiple
        accept={acceptedImageInput}
        onChange={(event) => onFiles(Array.from(event.target.files ?? []))}
      />
      <div className="dropzone-copy">
        <span className="dropzone-kicker">{appMessages.dropzone.formats}</span>
        <strong>{appMessages.dropzone.title}</strong>
        <p>{appMessages.dropzone.description}</p>
        <span className="dropzone-button">{appMessages.dropzone.button}</span>
      </div>
    </label>
  );
}
