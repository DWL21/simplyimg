import { bytesToHuman } from '../../lib/formatUtils';
import type { UploadedFile } from '../../types/image';

interface FileListProps {
  files: UploadedFile[];
  onRemove: (id: string) => void;
}

export function FileList({ files, onRemove }: FileListProps) {
  if (files.length === 0) {
    return <p className="muted">No files uploaded yet.</p>;
  }

  return (
    <div className="grid">
      {files.map((file) => (
        <div key={file.id} className="file-row">
          <div>
            <strong>{file.file.name}</strong>
            <div className="muted">{bytesToHuman(file.file.size)}</div>
          </div>
          <button className="button-ghost" onClick={() => onRemove(file.id)} type="button">
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
