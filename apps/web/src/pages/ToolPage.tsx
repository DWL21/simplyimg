import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useImageStore } from '../store/imageStore';
import type { ToolName, ToolOptions } from '../types/image';
import { DropZone } from '../components/upload/DropZone';
import { FileList } from '../components/upload/FileList';
import { ImagePreview } from '../components/editor/ImagePreview';
import { ProgressBar } from '../components/editor/ProgressBar';
import { DownloadPanel } from '../components/download/DownloadPanel';
import { bytesToHuman, formatLabel } from '../lib/formatUtils';

interface ToolPageProps {
  title: string;
  description: string;
  tool: ToolName;
  options: ToolOptions;
  optionsPanel: ReactNode;
}

export function ToolPage({ title, description, tool, options, optionsPanel }: ToolPageProps) {
  const files = useImageStore((state) => state.files);
  const results = useImageStore((state) => state.results);
  const progress = useImageStore((state) => state.progress);
  const isProcessing = useImageStore((state) => state.isProcessing);
  const error = useImageStore((state) => state.error);
  const addFiles = useImageStore((state) => state.addFiles);
  const removeFile = useImageStore((state) => state.removeFile);
  const processAll = useImageStore((state) => state.processAll);
  const downloadSingle = useImageStore((state) => state.downloadSingle);
  const downloadAll = useImageStore((state) => state.downloadAll);
  const activeTool = useImageStore((state) => state.activeTool);
  const setActiveTool = useImageStore((state) => state.setActiveTool);

  const firstPreview = useMemo(() => files[0]?.previewUrl, [files]);
  const firstResult = useMemo(() => results[0]?.url, [results]);

  return (
    <div className="page">
      <section className="hero">
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="pill-row">
          <span className="chip">Active: {formatLabel(activeTool)}</span>
          <span className="chip">Files: {files.length}</span>
          <span className="chip">Results: {results.length}</span>
          {files[0] ? <span className="chip">{bytesToHuman(files[0].file.size)}</span> : null}
        </div>
      </section>
      <div className="layout-two-col">
        <section className="grid">
          <DropZone onFiles={addFiles} />
          <div className="panel">
            <div className="section-title">
              <div>
                <h2>Upload queue</h2>
                <p>Drop files, then run the current tool against every item in the list.</p>
              </div>
              <button className="button-ghost" type="button" onClick={() => setActiveTool(tool)}>
                Select tool
              </button>
            </div>
            <div style={{ marginTop: 16 }}>
              <FileList files={files} onRemove={removeFile} />
            </div>
          </div>
          <div className="panel">
            <div className="section-title">
              <div>
                <h2>Preview</h2>
                <p>Original and processed previews share the same flow so each tool page stays lightweight.</p>
              </div>
            </div>
            <div className="preview-grid">
              {firstPreview ? (
                <ImagePreview src={firstPreview} alt="Uploaded preview" caption="Original" />
              ) : (
                <p className="muted">No input preview available yet.</p>
              )}
              {firstResult ? (
                <ImagePreview src={firstResult} alt="Processed preview" caption="Processed" />
              ) : (
                <p className="muted">Run processing to see the result preview.</p>
              )}
            </div>
          </div>
          {isProcessing ? <ProgressBar value={progress} /> : null}
          {error ? <p className="error">{error}</p> : null}
          <DownloadPanel results={results} onDownloadAll={downloadAll} onDownloadSingle={downloadSingle} />
        </section>
        <aside className="panel">
          <div className="section-title">
            <div>
              <h2>Controls</h2>
              <p>Tool-specific controls live here and can be replaced without changing page flow.</p>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>{optionsPanel}</div>
          <div className="toolbar" style={{ marginTop: 20 }}>
            <button className="button" type="button" onClick={() => processAll(tool, options)} disabled={isProcessing}>
              {isProcessing ? 'Processing...' : 'Process images'}
            </button>
            <button className="button-ghost" type="button" onClick={downloadAll} disabled={results.length === 0}>
              Download ZIP
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
