import { bytesToHuman } from '../../lib/formatUtils';
import type { ProcessedResult } from '../../types/image';

interface DownloadPanelProps {
  results: ProcessedResult[];
  onDownloadAll: () => void;
  onDownloadSingle: (index: number) => void;
}

export function DownloadPanel({ results, onDownloadAll, onDownloadSingle }: DownloadPanelProps) {
  return (
    <div className="panel">
      <div className="toolbar" style={{ justifyContent: 'space-between' }}>
        <strong>Results</strong>
        <button className="button" type="button" onClick={onDownloadAll} disabled={results.length === 0}>
          Download all
        </button>
      </div>
      <div className="grid" style={{ marginTop: 16 }}>
        {results.length === 0 ? (
          <p className="muted">No processed files yet.</p>
        ) : (
          results.map((result, index) => (
            <div key={result.id} className="download-item">
              <div>
                <strong>{result.name}</strong>
                <div className="muted">
                  {result.mimeType} · {bytesToHuman(result.size)}
                </div>
              </div>
              <button className="button-ghost" type="button" onClick={() => onDownloadSingle(index)}>
                Download
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
