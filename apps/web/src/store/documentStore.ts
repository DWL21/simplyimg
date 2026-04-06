import { create } from 'zustand';
import { printRenderedDocument, renderMarkdownPreviewDocument } from '../lib/markdownRenderer';
import type { DocumentRenderOptions, DocumentStoreState } from '../types/document';

function makeId() {
  return crypto.randomUUID();
}

function isDocumentFile(file: File) {
  const lowered = file.name.toLowerCase();
  return file.type.includes('markdown') || lowered.endsWith('.md') || lowered.endsWith('.markdown');
}

const defaultOptions: DocumentRenderOptions = {
  header: 'none',
  footer: 'none',
};

export const useDocumentStore = create<DocumentStoreState>((set, get) => ({
  files: [],
  previewHtml: null,
  printHtml: null,
  options: defaultOptions,
  isProcessing: false,
  progress: 0,
  error: null,
  async addFiles(files) {
    const nextFile = files.filter(isDocumentFile).at(-1);
    if (!nextFile) {
      set({
        files: [],
        previewHtml: null,
        printHtml: null,
        options: defaultOptions,
        error: 'md 파일만 추가할 수 있습니다.',
      });
      return;
    }

    set({
      files: [{ id: makeId(), file: nextFile }],
      previewHtml: null,
      printHtml: null,
      options: defaultOptions,
      isProcessing: true,
      progress: 0,
      error: null,
    });

    try {
      const rendered = await renderMarkdownPreviewDocument(nextFile, get().options);
      set({
        previewHtml: rendered.previewHtml,
        printHtml: rendered.printHtml,
        isProcessing: false,
        progress: 100,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '문서 렌더링에 실패했습니다.';
      set({
        previewHtml: null,
        printHtml: null,
        isProcessing: false,
        progress: 0,
        error: message,
      });
    }
  },
  async updateOptions(nextOptions) {
    const file = get().files[0]?.file;
    const merged = { ...get().options, ...nextOptions };
    set({ options: merged });
    if (!file) {
      return;
    }

    set({ isProcessing: true, error: null });
    try {
      const rendered = await renderMarkdownPreviewDocument(file, merged);
      set({
        previewHtml: rendered.previewHtml,
        printHtml: rendered.printHtml,
        isProcessing: false,
        progress: 100,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '문서 렌더링에 실패했습니다.';
      set({ isProcessing: false, error: message });
    }
  },
  removeFile(id) {
    set((state) => {
      return {
        files: state.files.filter((file) => file.id !== id),
        previewHtml: null,
        printHtml: null,
        options: defaultOptions,
        isProcessing: false,
        progress: 0,
        error: null,
      };
    });
  },
  async printDocument() {
    const html = get().printHtml;
    if (!html) {
      set({ error: '출력할 문서를 먼저 불러오세요.' });
      return;
    }

    try {
      await printRenderedDocument(html);
    } catch (error) {
      const message = error instanceof Error ? error.message : '출력에 실패했습니다.';
      set({ error: message });
    }
  },
  reset() {
    set({
      files: [],
      previewHtml: null,
      printHtml: null,
      options: defaultOptions,
      isProcessing: false,
      progress: 0,
      error: null,
    });
  },
}));
