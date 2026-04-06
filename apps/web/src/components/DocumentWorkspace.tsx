import { useEffect, useMemo, useRef, useState } from 'react';
import { useDocumentStore } from '../store/documentStore';
import { bytesToHuman } from '../lib/formatUtils';

interface DocumentWorkspaceProps {
  onBack: () => void;
}

export default function DocumentWorkspace({ onBack }: DocumentWorkspaceProps) {
  const files = useDocumentStore((state) => state.files);
  const results = useDocumentStore((state) => state.results);
  const isProcessing = useDocumentStore((state) => state.isProcessing);
  const progress = useDocumentStore((state) => state.progress);
  const error = useDocumentStore((state) => state.error);
  const addFiles = useDocumentStore((state) => state.addFiles);
  const removeFile = useDocumentStore((state) => state.removeFile);
  const processAll = useDocumentStore((state) => state.processAll);
  const downloadSingle = useDocumentStore((state) => state.downloadSingle);
  const downloadAll = useDocumentStore((state) => state.downloadAll);

  const [selectedId, setSelectedId] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedFile = useMemo(
    () => files.find((file) => file.id === selectedId) ?? files[0],
    [files, selectedId],
  );
  const selectedResultIndex = results.findIndex((result) => result.sourceFileId === selectedFile?.id);
  const selectedResult = selectedResultIndex >= 0 ? results[selectedResultIndex] : undefined;

  useEffect(() => {
    if (files.length > 0 && !files.find((file) => file.id === selectedId)) {
      setSelectedId(files[0].id);
      return;
    }

    if (files.length === 0 && selectedId) {
      setSelectedId('');
    }
  }, [files, selectedId]);

  function handleFiles(incoming: File[]) {
    addFiles(incoming);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    handleFiles(Array.from(event.dataTransfer.files));
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    handleFiles(Array.from(event.target.files ?? []));
    event.target.value = '';
  }

  if (!selectedFile) {
    return (
      <div className="upload-page" onDrop={handleDrop} onDragOver={(event) => event.preventDefault()}>
        <input
          ref={inputRef}
          id="document-upload-input"
          type="file"
          accept=".md,.markdown,text/markdown"
          onChange={handleChange}
          style={{ display: 'none' }}
        />

        <header className="upload-header">
          <button className="back-btn" onClick={onBack}>← 뒤로</button>
          <div className="document-upload-title">Markdown → PDF</div>
          <span className="tool-badge">MD</span>
        </header>

        <label className="upload-dropzone" htmlFor="document-upload-input">
          <div className="upload-inner">
            <div className="upload-icon">
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.4"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <strong className="upload-heading">Markdown 파일을 끌어다 놓거나</strong>
            <span className="upload-sub">클릭해서 파일을 선택하세요</span>
            <span className="upload-hint">MD</span>
          </div>
        </label>
      </div>
    );
  }

  return (
    <div className="document-page" onDrop={handleDrop} onDragOver={(event) => event.preventDefault()}>
      <input
        ref={inputRef}
        type="file"
        accept=".md,.markdown,text/markdown"
        style={{ display: 'none' }}
        onChange={handleChange}
      />

      <header className="edit-header">
        <button className="back-btn" onClick={onBack}>← 처음으로</button>
        <div className="document-header-copy">
          <strong>Markdown → PDF</strong>
        </div>
        <button className="add-more-btn" onClick={() => inputRef.current?.click()}>
          파일 바꾸기
        </button>
      </header>

      <div className="document-workspace">
        <section className="document-preview panel-surface">
          {selectedResult ? (
            <iframe
              key={selectedResult.url}
              title="PDF preview"
              src={selectedResult.url}
              className="document-preview-frame"
            />
          ) : (
            <div className="document-preview-empty">
              <strong>{selectedFile.file.name}</strong>
              <span>출력하기를 누르면 PDF 미리보기가 표시됩니다.</span>
            </div>
          )}
          <div className="document-preview-meta">
            <span>{selectedFile.file.name}</span>
            <span>{bytesToHuman(selectedFile.file.size)}</span>
            {selectedResult ? <span>{bytesToHuman(selectedResult.size)}</span> : null}
          </div>
          {error ? <p className="error-msg">{error}</p> : null}
          {isProcessing ? (
            <div className="progress-wrap document-progress">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <span className="progress-label">{progress}%</span>
            </div>
          ) : null}
        </section>

        <aside className="options-panel">
          <div className="options-scroll">
            <h3 className="panel-title">출력</h3>
            <div className="document-option-card"><strong>형식</strong><p>PDF</p></div>
            <div className="document-option-card"><strong>입력</strong><p>MD</p></div>
            <div className="document-option-card"><strong>파일명</strong><p>{selectedFile.file.name}</p></div>
            {results.length > 0 ? (
              <div className="document-results">
                <strong>결과</strong>
                <div className="done-list">
                  {results.map((result, index) => (
                    <div key={result.id} className="done-item">
                      <div className="done-item-info">
                        <span className="done-item-name">{result.name}</span>
                        <div className="done-item-meta">
                          <span>{bytesToHuman(result.size)}</span>
                        </div>
                      </div>
                      <button className="done-item-dl" onClick={() => downloadSingle(index)}>↓</button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <div className="panel-actions">
            <button className="process-btn" onClick={() => processAll()} disabled={isProcessing || files.length === 0}>
              {isProcessing ? '출력 중…' : '출력하기'}
            </button>
            <button className="re-edit-btn" onClick={() => downloadAll()} disabled={results.length === 0}>
              다운로드
            </button>
            <button className="re-edit-btn" onClick={() => removeFile(selectedFile.id)}>
              파일 제거
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
