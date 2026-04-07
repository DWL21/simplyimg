import type { UiError } from '../lib/uiErrors';

export interface UploadedDocument {
  id: string;
  file: File;
}

export interface DocumentRenderOptions {
  titlePosition: 'header' | 'footer' | 'none';
  pageNumberFormat: 'none' | 'page-n' | 'n-of-total' | 'n';
  showDateInFooter: boolean;
  contentScale: number; // 70–130, default 100
}

export interface DocumentStoreState {
  files: UploadedDocument[];
  previewHtml: string | null;
  printHtml: string | null;
  options: DocumentRenderOptions;
  isProcessing: boolean;
  progress: number;
  error: UiError | null;
  addFiles: (files: File[]) => Promise<void>;
  loadDraft: (markdown: string, fileName?: string) => Promise<void>;
  updateOptions: (options: Partial<DocumentRenderOptions>) => Promise<void>;
  removeFile: (id: string) => void;
  printDocument: () => Promise<void>;
  reset: () => void;
}
