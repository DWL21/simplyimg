import { create } from 'zustand';
import {
  createDocumentFileTooLargeError,
  createDocumentRenderingError,
  createEmptyFileError,
  createUnsupportedDocumentFileError,
  normalizeUiError,
} from '../lib/uiErrors';
import { getDocumentUploadLimitBytes } from '../lib/uploadLimits';
import { downloadAsPdf, renderMarkdownPreviewDocument } from '../lib/markdownRenderer';
import type { DocumentRenderOptions, DocumentStoreState } from '../types/document';

function makeId() {
  return crypto.randomUUID();
}

function isDocumentFile(file: File) {
  const lowered = file.name.toLowerCase();
  return file.type.includes('markdown') || lowered.endsWith('.md') || lowered.endsWith('.markdown');
}

function validateDocumentFile(file: File) {
  if (!isDocumentFile(file)) {
    return createUnsupportedDocumentFileError(file);
  }

  if (file.size <= 0) {
    return createEmptyFileError(file);
  }

  if (file.size > getDocumentUploadLimitBytes()) {
    return createDocumentFileTooLargeError(file);
  }

  return null;
}

const defaultOptions: DocumentRenderOptions = {
  titlePosition: 'none',
  pageNumberFormat: 'none',
  showDateInFooter: false,
  contentScale: 100,
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
    const candidates = files.map((file) => ({
      file,
      error: validateDocumentFile(file),
    }));
    const nextFile = candidates.filter((candidate) => !candidate.error).at(-1)?.file;
    if (!nextFile) {
      const firstError = candidates.find((candidate) => candidate.error)?.error;
      set({
        files: [],
        previewHtml: null,
        printHtml: null,
        options: defaultOptions,
        error: firstError ?? {
          code: 'UNSUPPORTED_FILE',
          message: 'Markdown 파일만 추가할 수 있습니다.',
          retryable: false,
          scope: 'upload',
        },
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
      const uiError = normalizeUiError(error, createDocumentRenderingError(nextFile));
      set({
        previewHtml: null,
        printHtml: null,
        isProcessing: false,
        progress: 0,
        error: uiError,
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
      set({
        isProcessing: false,
        error: normalizeUiError(error, createDocumentRenderingError(file)),
      });
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
    const file = get().files[0]?.file;
    if (!html || !file) {
      set({
        error: {
          code: 'INVALID_REQUEST',
          message: '저장할 문서를 먼저 불러오세요.',
          retryable: false,
          scope: 'render',
        },
      });
      return;
    }

    set({ isProcessing: true, error: null });
    try {
      await downloadAsPdf(html, file.name);
    } catch (error) {
      set({
        error: normalizeUiError(error, createDocumentRenderingError(file, 'PDF 저장에 실패했습니다.')),
      });
    } finally {
      set({ isProcessing: false });
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
