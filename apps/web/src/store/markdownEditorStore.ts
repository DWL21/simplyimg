import { create } from 'zustand';
import { getCurrentLocale } from '../i18n/messages';
import { isMarkdownFile } from '../lib/markdownFiles';
import {
  createDocumentFileTooLargeError,
  createEmptyFileError,
  createUnsupportedDocumentFileError,
  normalizeUiError,
  type UiError,
} from '../lib/uiErrors';
import { getDocumentUploadLimitBytes } from '../lib/uploadLimits';

interface MarkdownEditorStoreState {
  fileName: string;
  markdown: string;
  error: UiError | null;
  setFileName: (value: string) => void;
  setMarkdown: (value: string) => void;
  loadFile: (file: File) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

function validateMarkdownFile(file: File) {
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

export const useMarkdownEditorStore = create<MarkdownEditorStoreState>((set) => ({
  fileName: '',
  markdown: '',
  error: null,
  setFileName(value) {
    set({ fileName: value, error: null });
  },
  setMarkdown(value) {
    set({ markdown: value, error: null });
  },
  async loadFile(file) {
    const validationError = validateMarkdownFile(file);
    if (validationError) {
      set({ error: validationError });
      return;
    }

    try {
      const markdown = await file.text();
      set({
        fileName: file.name,
        markdown,
        error: null,
      });
    } catch (error) {
      set({
        error: normalizeUiError(error, {
          code: 'RENDER_FAILED',
          message: getCurrentLocale() === 'ko'
            ? `${file.name}: Markdown 파일을 불러오지 못했습니다.`
            : `${file.name}: Failed to load the Markdown file.`,
          retryable: true,
          scope: 'upload',
          fileName: file.name,
        }),
      });
    }
  },
  clearError() {
    set({ error: null });
  },
  reset() {
    set({
      fileName: '',
      markdown: '',
      error: null,
    });
  },
}));
