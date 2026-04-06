import { bytesToHuman } from '../../lib/formatUtils';
import type { ProcessedResult, UploadedFile } from '../../types/image';
import { appMessages } from '../../i18n/messages';

interface FileListProps {
  files: UploadedFile[];
  onRemove: (id: string) => void;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  results?: ProcessedResult[];
}

export function FileList({ files, onRemove, selectedId, onSelect, results = [] }: FileListProps) {
  if (files.length === 0) {
    return <p className="empty-copy">{appMessages.fileList.empty}</p>;
  }

  return (
    <div className="file-list">
      {files.map((file) => (
        <div
          key={file.id}
          className={file.id === selectedId ? 'file-row is-selected' : 'file-row'}
          onClick={() => onSelect?.(file.id)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onSelect?.(file.id);
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="file-row-main">
            <img className="file-thumb" src={file.previewUrl} alt={file.file.name} />
            <div className="file-row-copy">
              <strong>{file.file.name}</strong>
              <div className="file-row-meta">
                <span>{bytesToHuman(file.file.size)}</span>
                {results.some((result) => result.sourceFileId === file.id) ? (
                  <span className="file-status">{appMessages.fileList.done}</span>
                ) : null}
              </div>
            </div>
          </div>
          <button
            className="icon-button"
            onClick={(event) => {
              event.stopPropagation();
              onRemove(file.id);
            }}
            type="button"
            aria-label={`${file.file.name} ${appMessages.fileList.remove}`}
          >
            {appMessages.fileList.remove}
          </button>
        </div>
      ))}
    </div>
  );
}
