import { bytesToHuman } from '../../lib/formatUtils';
import type { ProcessedResult } from '../../types/image';
import { appMessages } from '../../i18n/messages';

interface DownloadPanelProps {
  results: ProcessedResult[];
  onDownloadAll: () => void;
  onDownloadSingle: (index: number) => void;
}

export function DownloadPanel({ results, onDownloadAll, onDownloadSingle }: DownloadPanelProps) {
  return (
    <div className="stage-card">
      <div className="section-heading">
        <div>
          <h2>{appMessages.download.title}</h2>
          <p>{appMessages.download.description}</p>
        </div>
        <button
          className="secondary-button"
          type="button"
          onClick={onDownloadAll}
          disabled={results.length === 0}
        >
          {appMessages.workspace.downloadAll}
        </button>
      </div>
      <div className="result-list">
        {results.length === 0 ? (
          <p className="empty-copy">{appMessages.download.empty}</p>
        ) : (
          results.map((result, index) => (
            <div key={result.id} className="result-row">
              <div className="result-copy">
                <strong>{result.name}</strong>
                <div className="result-meta">
                  {result.mimeType} · {bytesToHuman(result.size)}
                </div>
              </div>
              <button
                className="text-button"
                type="button"
                onClick={() => onDownloadSingle(index)}
              >
                {appMessages.download.itemAction}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
