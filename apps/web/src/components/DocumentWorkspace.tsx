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
          파일 선택
        </button>
      </header>

      <div className="document-body">
        <aside className="document-sidebar panel-surface">
          <div className="document-section-head">
            <div>
              <h2>파일</h2>
            </div>
            <span className="document-count">{files.length > 0 ? '1개' : '0개'}</span>
          </div>
          <div className="document-list">
            {files.length === 0 ? (
              <button className="document-empty" onClick={() => inputRef.current?.click()}>
                <strong>Markdown 파일을 선택하세요</strong>
                <span>지원 형식: MD</span>
              </button>
            ) : (
              files.map((file) => {
                const isSelected = file.id === selectedFile?.id;
                const result = results.find((item) => item.sourceFileId === file.id);
                return (
                  <div
                    key={file.id}
                    className={`document-item ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => setSelectedId(file.id)}
                  >
                    <div className="document-badge">MD</div>
                    <div className="document-item-copy">
                      <strong>{file.file.name}</strong>
                      <span>{bytesToHuman(file.file.size)}</span>
                    </div>
                    {result ? <span className="document-status">PDF</span> : null}
                    <button
                      className="document-remove"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeFile(file.id);
                      }}
                    >
                      ×
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        <section className="document-main panel-surface">
          <div className="document-main-copy">
            <span className="document-eyebrow">DOCUMENT</span>
            <h1>Markdown to PDF</h1>
          </div>

          <div className="document-summary-grid">
            <div className="document-summary-card">
              <span>선택 파일</span>
              <strong>{selectedFile?.file.name ?? '아직 없음'}</strong>
              <p>{selectedFile ? bytesToHuman(selectedFile.file.size) : '-'}</p>
            </div>
            <div className="document-summary-card">
              <span>변환 결과</span>
              <strong>{selectedResult?.name ?? 'PDF 대기 중'}</strong>
              <p>{selectedResult ? bytesToHuman(selectedResult.size) : '-'}</p>
            </div>
            <div className="document-summary-card">
              <span>지원 형식</span>
              <strong>MD → PDF</strong>
            </div>
          </div>

          {selectedFile ? (
            <div className="document-detail-card">
              <div>
                <h2>선택한 문서 정보</h2>
              </div>
              <dl className="document-detail-list">
                <div>
                  <dt>파일명</dt>
                  <dd>{selectedFile.file.name}</dd>
                </div>
                <div>
                  <dt>형식</dt>
                  <dd>MD</dd>
                </div>
                <div>
                  <dt>원본 크기</dt>
                  <dd>{bytesToHuman(selectedFile.file.size)}</dd>
                </div>
                <div>
                  <dt>출력</dt>
                  <dd>{selectedResult ? selectedResult.name : 'PDF로 변환 예정'}</dd>
                </div>
              </dl>
            </div>
          ) : null}

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
            <h3 className="panel-title">PDF 변환</h3>
            <div className="document-option-card">
              <strong>출력 형식</strong>
              <p>PDF</p>
            </div>
            <div className="document-option-card">
              <strong>변환 엔진</strong>
              <p>브라우저</p>
            </div>
            <div className="document-option-card">
              <strong>입력</strong>
              <p>단일 파일</p>
            </div>
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
              {isProcessing ? '변환 중…' : 'PDF로 변환'}
            </button>
            <button className="re-edit-btn" onClick={() => downloadAll()} disabled={results.length === 0}>
              다운로드
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
