import { useEffect, useMemo, useRef, useState } from 'react';
import { useDocumentStore } from '../store/documentStore';
import { bytesToHuman } from '../lib/formatUtils';

interface DocumentWorkspaceProps {
  onBack: () => void;
}

function documentKindLabel(file: File) {
  const lowered = file.name.toLowerCase();
  if (lowered.endsWith('.docx')) {
    return 'DOCX';
  }
  return 'MD';
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
        multiple
        accept=".md,.markdown,.docx,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        style={{ display: 'none' }}
        onChange={handleChange}
      />

      <header className="edit-header">
        <button className="back-btn" onClick={onBack}>← 처음으로</button>
        <div className="document-header-copy">
          <strong>문서 → PDF</strong>
          <span>md, docx 문서를 업로드해서 PDF로 일괄 변환합니다.</span>
        </div>
        <button className="add-more-btn" onClick={() => inputRef.current?.click()}>
          + 문서 추가
        </button>
      </header>

      <div className="document-body">
        <aside className="document-sidebar panel-surface">
          <div className="document-section-head">
            <div>
              <h2>문서 목록</h2>
              <p>현재 이미지 기능은 별도 섹션으로 유지하고, 문서 변환은 여기서 분리해 처리합니다.</p>
            </div>
            <span className="document-count">{files.length}개</span>
          </div>
          <div className="document-list">
            {files.length === 0 ? (
              <button className="document-empty" onClick={() => inputRef.current?.click()}>
                <strong>문서를 끌어다 놓거나 클릭해서 추가</strong>
                <span>지원 형식: MD, DOCX</span>
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
                    <div className="document-badge">{documentKindLabel(file.file)}</div>
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
            <h1>문서 섹션</h1>
            <p>기존 이미지 도구와 분리된 흐름으로 `md`, `docx`를 `pdf`로 변환합니다.</p>
          </div>

          <div className="document-summary-grid">
            <div className="document-summary-card">
              <span>선택 문서</span>
              <strong>{selectedFile?.file.name ?? '아직 없음'}</strong>
              <p>{selectedFile ? bytesToHuman(selectedFile.file.size) : '왼쪽 목록에서 파일을 고르세요.'}</p>
            </div>
            <div className="document-summary-card">
              <span>변환 결과</span>
              <strong>{selectedResult?.name ?? 'PDF 대기 중'}</strong>
              <p>{selectedResult ? bytesToHuman(selectedResult.size) : '변환 후 다운로드 목록에 추가됩니다.'}</p>
            </div>
            <div className="document-summary-card">
              <span>지원 형식</span>
              <strong>MD · DOCX → PDF</strong>
              <p>한 번에 여러 문서를 업로드해 일괄 처리할 수 있습니다.</p>
            </div>
          </div>

          {selectedFile ? (
            <div className="document-detail-card">
              <div>
                <h2>선택한 문서 정보</h2>
                <p>원본 미리보기 대신 변환 흐름과 결과 상태를 빠르게 확인할 수 있게 구성했습니다.</p>
              </div>
              <dl className="document-detail-list">
                <div>
                  <dt>파일명</dt>
                  <dd>{selectedFile.file.name}</dd>
                </div>
                <div>
                  <dt>형식</dt>
                  <dd>{documentKindLabel(selectedFile.file)}</dd>
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
              <p>현재 문서 섹션은 PDF 단일 출력으로 고정합니다.</p>
            </div>
            <div className="document-option-card">
              <strong>변환 엔진</strong>
              <p>MD는 브라우저에서 직접 렌더링한 레이아웃으로 PDF를 만들고, DOCX만 worker로 보냅니다.</p>
            </div>
            <div className="document-option-card">
              <strong>일괄 처리</strong>
              <p>{files.length === 0 ? '문서를 올리면 여기서 한 번에 변환할 수 있습니다.' : `${files.length}개 문서를 순서대로 PDF로 변환합니다.`}</p>
            </div>
            {results.length > 0 ? (
              <div className="document-results">
                <strong>결과 파일</strong>
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
              전체 다운로드
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
