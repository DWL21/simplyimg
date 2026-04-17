import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { DownloadPanel } from '../components/download/DownloadPanel';
import { ImagePreview } from '../components/editor/ImagePreview';
import { ProgressBar } from '../components/editor/ProgressBar';
import ResizeEditor from '../components/ResizeEditor';
import { DropZone } from '../components/upload/DropZone';
import { FileList } from '../components/upload/FileList';
import { appMessages, formatOriginalAlt, formatProcessedAlt, useAppLocale } from '../i18n/messages';
import { bytesToHuman, formatLabel } from '../lib/formatUtils';
import { wasmClient } from '../lib/wasmClient';
import { useImageStore } from '../store/imageStore';
import type { ImageInfo, ResizeOptions, ToolName, ToolOptions } from '../types/image';

interface ToolWorkspaceProps {
  title: string;
  description: string;
  tool: ToolName;
  options: ToolOptions;
  onOptionsChange?: (options: ToolOptions) => void;
  optionsPanel: ReactNode;
  processLabel: string;
}

const emptyInfo: ImageInfo = {
  width: 0,
  height: 0,
  format: '',
  size: 0,
};

export function ToolWorkspace({
  title,
  description,
  tool,
  options,
  onOptionsChange,
  optionsPanel,
  processLabel,
}: ToolWorkspaceProps) {
  const locale = useAppLocale();
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
  const setActiveTool = useImageStore((state) => state.setActiveTool);
  const reset = useImageStore((state) => state.reset);

  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedInfo, setSelectedInfo] = useState<ImageInfo>(emptyInfo);
  const [livePreviewUrl, setLivePreviewUrl] = useState<string | null>(null);
  const lastResizeFileIdRef = useRef<string | null>(null);

  useEffect(() => {
    setActiveTool(tool);
  }, [setActiveTool, tool]);

  useEffect(() => {
    if (files.length === 0) {
      setSelectedFileId(null);
      return;
    }

    const hasSelected = files.some((file) => file.id === selectedFileId);
    if (!hasSelected) {
      setSelectedFileId(files[0].id);
    }
  }, [files, selectedFileId]);

  const selectedFile = files.find((file) => file.id === selectedFileId) ?? null;
  const selectedResult = results.find((result) => result.sourceFileId === selectedFileId) ?? null;
  const resizeOptions = tool === 'resize' ? (options as ResizeOptions) : null;

  useEffect(() => {
    let cancelled = false;

    if (!selectedFile) {
      setSelectedInfo(emptyInfo);
      return;
    }

    wasmClient.getInfo(selectedFile.file).then((info) => {
      if (!cancelled) {
        setSelectedInfo(info);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selectedFile]);

  useEffect(() => {
    if (tool !== 'resize' || !selectedFile || !resizeOptions) {
      setLivePreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return null;
      });
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const processed = await wasmClient.process('resize', selectedFile.file, resizeOptions);
        if (cancelled) {
          return;
        }

        const nextUrl = URL.createObjectURL(processed.blob);
        setLivePreviewUrl((current) => {
          if (current) {
            URL.revokeObjectURL(current);
          }
          return nextUrl;
        });
      } catch {
        if (!cancelled) {
          setLivePreviewUrl((current) => current);
        }
      }
    }, 80);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [resizeOptions, selectedFile, tool]);

  useEffect(() => () => {
    setLivePreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
  }, []);

  const totalInputSize = files.reduce((sum, file) => sum + file.file.size, 0);
  const totalOutputSize = results.reduce((sum, result) => sum + result.size, 0);
  const processedPreviewSrc = tool === 'resize' ? livePreviewUrl ?? selectedResult?.url : selectedResult?.url;

  return (
    <div className="workspace-page">
      <section className="workspace-hero">
        <div className="workspace-hero-copy">
          <span className="eyebrow">
            {appMessages.workspace.titlePrefix} / {formatLabel(tool)}
          </span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="workspace-stats">
          <div className="metric-card">
            <span>{appMessages.workspace.uploaded}</span>
            <strong>{files.length}</strong>
            <p>{bytesToHuman(totalInputSize)}</p>
          </div>
          <div className="metric-card">
            <span>{appMessages.workspace.completed}</span>
            <strong>{results.length}</strong>
            <p>
              {results.length > 0 ? bytesToHuman(totalOutputSize) : appMessages.workspace.notProcessed}
            </p>
          </div>
        </div>
      </section>

      <div className="workspace-shell">
        <section className="workspace-main">
          <div className="stage-card">
            <div className="section-heading">
              <div>
                <h2>{appMessages.workspace.selectImagesTitle}</h2>
                <p>{appMessages.workspace.selectImagesDescription}</p>
              </div>
              {files.length > 0 ? (
                <button className="text-button" type="button" onClick={reset}>
                  {appMessages.workspace.newTask}
                </button>
              ) : null}
            </div>
            <DropZone onFiles={addFiles} />
          </div>

          <div className="workspace-content">
            <div className="stage-card">
              <div className="section-heading">
                <div>
                  <h2>{appMessages.workspace.selectedFilesTitle}</h2>
                  <p>{appMessages.workspace.selectedFilesDescription}</p>
                </div>
              </div>
              <FileList
                files={files}
                onRemove={removeFile}
                selectedId={selectedFileId}
                onSelect={setSelectedFileId}
                results={results}
              />
            </div>

            <div className="preview-column">
              <div className="stage-card">
                <div className="section-heading">
                  <div>
                    <h2>{appMessages.workspace.previewTitle}</h2>
                    <p>{appMessages.workspace.previewDescription}</p>
                  </div>
                </div>
                <div className="preview-grid">
                  {tool === 'resize' && selectedFile && resizeOptions && onOptionsChange ? (
                    <div className="preview-box">
                      <div className="preview-frame preview-frame-editor">
                        <ResizeEditor
                          imageUrl={selectedFile.previewUrl}
                          width={resizeOptions.width}
                          height={resizeOptions.height}
                          crop={resizeOptions.crop}
                          alignLabel={appMessages.editor.alignCenter}
                          zoomInLabel={appMessages.editor.zoomIn}
                          zoomOutLabel={appMessages.editor.zoomOut}
                          onImageLoad={(naturalWidth, naturalHeight) => {
                            if (lastResizeFileIdRef.current === selectedFile.id) return;
                            lastResizeFileIdRef.current = selectedFile.id;
                            onOptionsChange({ ...resizeOptions, width: naturalWidth, height: naturalHeight });
                          }}
                          onChange={(nextResize) => onOptionsChange({ ...resizeOptions, ...nextResize })}
                        />
                      </div>
                      <span className="muted">{appMessages.workspace.original}</span>
                    </div>
                  ) : (
                    <ImagePreview
                      src={selectedFile?.previewUrl}
                      alt={formatOriginalAlt(locale, selectedFile?.file.name)}
                      caption={appMessages.workspace.original}
                      emptyLabel={appMessages.workspace.originalEmpty}
                    />
                  )}
                  <ImagePreview
                    src={processedPreviewSrc ?? undefined}
                    alt={formatProcessedAlt(locale, selectedResult?.name)}
                    caption={appMessages.workspace.processed}
                    emptyLabel={appMessages.workspace.processedEmpty}
                  />
                </div>
              </div>

              <div className="stage-card">
                <div className="section-heading">
                  <div>
                    <h2>{appMessages.workspace.selectedInfoTitle}</h2>
                    <p>{appMessages.workspace.selectedInfoDescription}</p>
                  </div>
                </div>
                <div className="meta-grid">
                  <div className="meta-item">
                    <span>{appMessages.workspace.fileName}</span>
                    <strong>{selectedFile?.file.name ?? appMessages.common.none}</strong>
                  </div>
                  <div className="meta-item">
                    <span>{appMessages.workspace.originalSize}</span>
                    <strong>{selectedFile ? bytesToHuman(selectedFile.file.size) : appMessages.common.none}</strong>
                  </div>
                  <div className="meta-item">
                    <span>{appMessages.workspace.dimensions}</span>
                    <strong>
                      {selectedInfo.width > 0
                        ? `${selectedInfo.width} x ${selectedInfo.height}`
                        : appMessages.common.none}
                    </strong>
                  </div>
                  <div className="meta-item">
                    <span>{appMessages.workspace.format}</span>
                    <strong>{selectedInfo.format ? selectedInfo.format : appMessages.common.none}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {isProcessing ? (
            <div className="stage-card">
              <ProgressBar value={progress} />
            </div>
          ) : null}

          {error ? <p className="error-banner">{error.message}</p> : null}

          <DownloadPanel
            results={results}
            onDownloadAll={downloadAll}
            onDownloadSingle={downloadSingle}
          />
        </section>

        <aside className="workspace-sidebar">
          <div className="sidebar-card">
            <div className="section-heading">
              <div>
                <h2>{appMessages.workspace.optionsTitle}</h2>
                <p>{appMessages.workspace.optionsDescription}</p>
              </div>
            </div>
            {optionsPanel}
            <div className="sidebar-actions">
              <button
                className="primary-button"
                type="button"
                onClick={() => processAll(tool, options)}
                disabled={isProcessing || files.length === 0}
              >
                {isProcessing ? appMessages.workspace.processing : processLabel}
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={downloadAll}
                disabled={results.length === 0}
              >
                {appMessages.workspace.downloadAll}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
