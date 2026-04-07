import { create } from 'zustand';
import { getCurrentLocale } from '../i18n/messages';
import { isMarkdownFile, normalizeMarkdownFileName } from '../lib/markdownFiles';
import {
  createDocumentFileTooLargeError,
  createDocumentRenderingError,
  createEmptyFileError,
  createUnsupportedDocumentFileError,
  normalizeUiError,
} from '../lib/uiErrors';
import { getDocumentUploadLimitBytes } from '../lib/uploadLimits';
import { downloadAsPdf, renderMarkdownPreviewDocument, renderMarkdownPreviewSource } from '../lib/markdownRenderer';
import type { DocumentRenderOptions, DocumentStoreState } from '../types/document';

function makeId() {
  return crypto.randomUUID();
}

function validateDocumentFile(file: File) {
  if (!isMarkdownFile(file)) {
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
          message: getCurrentLocale() === 'ko'
            ? 'Markdown 파일만 추가할 수 있습니다.'
            : 'Only Markdown files can be added.',
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
  async loadDraft(markdown, fileName) {
    const normalizedFileName = normalizeMarkdownFileName(fileName ?? '');
    const draftFile = new File([markdown], normalizedFileName, { type: 'text/markdown' });

    set({
      files: [{ id: makeId(), file: draftFile }],
      previewHtml: null,
      printHtml: null,
      options: defaultOptions,
      isProcessing: true,
      progress: 0,
      error: null,
    });

    try {
      const rendered = await renderMarkdownPreviewSource(markdown, normalizedFileName, defaultOptions);
      set({
        previewHtml: rendered.previewHtml,
        printHtml: rendered.printHtml,
        options: defaultOptions,
        isProcessing: false,
        progress: 100,
      });
    } catch (error) {
      const uiError = normalizeUiError(
        error,
        createDocumentRenderingError(
          draftFile,
          getCurrentLocale() === 'ko'
            ? 'Markdown 초안을 불러오지 못했습니다.'
            : 'Failed to load the Markdown draft.',
        ),
      );
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
          message: getCurrentLocale() === 'ko'
            ? '저장할 문서를 먼저 불러오세요.'
            : 'Load a document before saving.',
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
        error: normalizeUiError(
          error,
          createDocumentRenderingError(
            file,
            getCurrentLocale() === 'ko' ? 'PDF 저장에 실패했습니다.' : 'Failed to save the PDF.',
          ),
        ),
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
