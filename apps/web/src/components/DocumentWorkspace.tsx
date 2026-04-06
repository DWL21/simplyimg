import { useEffect, useMemo, useRef, useState } from 'react';
import { useBeforeUnloadWarning } from '../hooks/useBeforeUnloadWarning';
import { useDocumentStore } from '../store/documentStore';
import { bytesToHuman } from '../lib/formatUtils';
import UnsavedChangesAlert from './UnsavedChangesAlert';

interface DocumentWorkspaceProps {
  onBack: () => void;
}

export default function DocumentWorkspace({ onBack }: DocumentWorkspaceProps) {
  const files = useDocumentStore((state) => state.files);
  const previewHtml = useDocumentStore((state) => state.previewHtml);
  const options = useDocumentStore((state) => state.options);
  const isProcessing = useDocumentStore((state) => state.isProcessing);
  const progress = useDocumentStore((state) => state.progress);
  const error = useDocumentStore((state) => state.error);
  const addFiles = useDocumentStore((state) => state.addFiles);
  const removeFile = useDocumentStore((state) => state.removeFile);
  const updateOptions = useDocumentStore((state) => state.updateOptions);
  const printDocument = useDocumentStore((state) => state.printDocument);

  const [selectedId, setSelectedId] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedFile = useMemo(
    () => files.find((file) => file.id === selectedId) ?? files[0],
    [files, selectedId],
  );
  const hasUnsavedDocument = files.length > 0;

  useBeforeUnloadWarning(hasUnsavedDocument);

  useEffect(() => {
    if (files.length > 0 && !files.find((file) => file.id === selectedId)) {
      setSelectedId(files[0].id);
      return;
    }

    if (files.length === 0 && selectedId) {
      setSelectedId('');
    }
  }, [files, selectedId]);

  async function handleFiles(incoming: File[]) {
    await addFiles(incoming);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    void handleFiles(Array.from(event.dataTransfer.files));
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    void handleFiles(Array.from(event.target.files ?? []));
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
        <UnsavedChangesAlert className="document-unsaved-alert" />
        <section className="document-preview panel-surface">
          {previewHtml ? (
            <iframe
              title="A4 preview"
              srcDoc={previewHtml}
              sandbox="allow-scripts"
              className="document-preview-frame"
            />
          ) : (
            <div className="document-preview-empty">
              <strong>{selectedFile.file.name}</strong>
              <span>{isProcessing ? '미리보기를 준비하는 중입니다.' : '미리보기를 불러오지 못했습니다.'}</span>
            </div>
          )}
          <div className="document-preview-meta">
            <span>{selectedFile.file.name}</span>
            <span>{bytesToHuman(selectedFile.file.size)}</span>
            <span>MD</span>
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
            <h3 className="panel-title">PDF export</h3>
            <div className="document-option-card"><strong>파일명</strong><p>{selectedFile.file.name}</p></div>
            <div className="document-option-card">
              <strong>파일명</strong>
              <label className="document-select-field">
                <select
                  className="document-select"
                  value={options.titlePosition}
                  onChange={(event) => void updateOptions({ titlePosition: event.target.value as 'header' | 'footer' | 'none' })}
                >
                  <option value="none">표시 안함</option>
                  <option value="header">머리말</option>
                  <option value="footer">꼬리말</option>
                </select>
              </label>
            </div>
            <div className="document-option-card">
              <strong>페이지 번호</strong>
              <label className="document-select-field">
                <select
                  className="document-select"
                  value={options.pageNumberFormat}
                  onChange={(event) => void updateOptions({ pageNumberFormat: event.target.value as 'none' | 'page-n' | 'n-of-total' | 'n' })}
                >
                  <option value="none">표시 안함</option>
                  <option value="page-n">페이지 1</option>
                  <option value="n-of-total">1/전체</option>
                  <option value="n">1</option>
                </select>
              </label>
            </div>
            <div className="document-option-card">
              <strong>오늘 날짜</strong>
              <label className="document-select-field">
                <select
                  className="document-select"
                  value={options.showDateInFooter ? 'footer' : 'none'}
                  onChange={(event) => void updateOptions({ showDateInFooter: event.target.value === 'footer' })}
                >
                  <option value="none">표시 안함</option>
                  <option value="footer">꼬리말</option>
                </select>
              </label>
            </div>
            <div className="document-option-card">
              <strong>표시 크기</strong>
              <div className="doc-scale-row">
                <input
                  type="range"
                  className="range-input"
                  min={70}
                  max={130}
                  step={5}
                  value={options.contentScale}
                  onChange={(event) => void updateOptions({ contentScale: Number(event.target.value) })}
                />
                <span className="doc-scale-label">{options.contentScale}%</span>
              </div>
            </div>
            <div className="document-option-card"><strong>상태</strong><p>{isProcessing ? '렌더링 중' : previewHtml ? '준비됨' : '대기 중'}</p></div>
          </div>
          <div className="panel-actions">
            <button className="process-btn" onClick={() => printDocument()} disabled={isProcessing || !previewHtml}>
              {isProcessing ? '저장 준비 중…' : '저장하기'}
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
