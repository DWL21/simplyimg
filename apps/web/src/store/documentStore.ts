import JSZip from 'jszip';
import { create } from 'zustand';
import { renderMarkdownToPdf } from '../lib/markdownPdf';
import { postDocumentToWorker } from '../lib/documentClient';
import { bytesToHuman } from '../lib/formatUtils';
import type { DocumentResult, DocumentStoreState } from '../types/document';

function makeId() {
  return crypto.randomUUID();
}

function isDocumentFile(file: File) {
  const lowered = file.name.toLowerCase();
  return (
    file.type.includes('markdown') ||
    file.type.includes(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ) ||
    lowered.endsWith('.md') ||
    lowered.endsWith('.markdown') ||
    lowered.endsWith('.docx')
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadUrl(url: string, filename: string) {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
}

function deriveResultName(file: File) {
  const base = file.name.replace(/\.[^.]+$/, '');
  return `${base}.pdf`;
}

function isMarkdownFile(file: File) {
  const lowered = file.name.toLowerCase();
  return file.type.includes('markdown') || lowered.endsWith('.md') || lowered.endsWith('.markdown');
}

export const useDocumentStore = create<DocumentStoreState>((set, get) => ({
  files: [],
  results: [],
  isProcessing: false,
  progress: 0,
  error: null,
  addFiles(files) {
    const nextFiles = files.filter(isDocumentFile);
    get().results.forEach((result) => URL.revokeObjectURL(result.url));
    set((state) => ({
      files: [
        ...state.files,
        ...nextFiles.map((file) => ({
          id: makeId(),
          file,
        })),
      ],
      results: [],
      error: nextFiles.length === 0 ? 'md 또는 docx 문서만 추가할 수 있습니다.' : null,
    }));
  },
  removeFile(id) {
    set((state) => {
      state.results
        .filter((result) => result.sourceFileId === id)
        .forEach((result) => URL.revokeObjectURL(result.url));
      return {
        files: state.files.filter((file) => file.id !== id),
        results: state.results.filter((result) => result.sourceFileId !== id),
      };
    });
  },
  async processAll() {
    const files = get().files;
    if (files.length === 0) {
      set({ error: '변환할 문서를 먼저 업로드하세요.' });
      return;
    }

    set({ isProcessing: true, progress: 0, error: null });

    try {
      get().results.forEach((result) => URL.revokeObjectURL(result.url));
      const nextResults: DocumentResult[] = [];
      for (let index = 0; index < files.length; index += 1) {
        const uploaded = files[index];
        const processed = isMarkdownFile(uploaded.file)
          ? await renderMarkdownToPdf(uploaded.file)
          : await postDocumentToWorker(uploaded.file);
        const url = URL.createObjectURL(processed.blob);
        nextResults.push({
          id: makeId(),
          name: deriveResultName(uploaded.file),
          mimeType: processed.mimeType,
          size: processed.blob.size,
          url,
          sourceFileId: uploaded.id,
        });
        set({ progress: Math.round(((index + 1) / files.length) * 100) });
      }

      set({ results: nextResults, isProcessing: false, progress: 100 });
    } catch (error) {
      const message = error instanceof Error ? error.message : '문서 변환에 실패했습니다.';
      set({ isProcessing: false, error: message });
    }
  },
  downloadSingle(index) {
    const result = get().results[index];
    if (!result) {
      return;
    }

    downloadUrl(result.url, result.name);
  },
  async downloadAll() {
    const { results } = get();
    if (results.length === 0) {
      return;
    }

    const zip = new JSZip();
    for (const result of results) {
      const response = await fetch(result.url);
      zip.file(result.name, await response.arrayBuffer());
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, `simplyimg-documents-${bytesToHuman(blob.size)}.zip`);
  },
  reset() {
    get().results.forEach((result) => URL.revokeObjectURL(result.url));
    set({
      files: [],
      results: [],
      isProcessing: false,
      progress: 0,
      error: null,
    });
  },
}));
