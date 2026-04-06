import { useDropZone } from '../../hooks/useDropZone';

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
        accept="image/*"
        onChange={(event) => onFiles(Array.from(event.target.files ?? []))}
      />
      <div>
        <strong>Drop images here</strong>
        <p>or click to upload JPEG, PNG, WebP, or GIF files.</p>
      </div>
    </label>
  );
}
