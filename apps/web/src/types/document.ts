export interface UploadedDocument {
  id: string;
  file: File;
}

export interface DocumentRenderOptions {
  header: 'none' | 'fileName';
  footer: 'none' | 'fileName' | 'pageNumber';
}

export interface DocumentStoreState {
  files: UploadedDocument[];
  previewHtml: string | null;
  printHtml: string | null;
  options: DocumentRenderOptions;
  isProcessing: boolean;
  progress: number;
  error: string | null;
  addFiles: (files: File[]) => Promise<void>;
  updateOptions: (options: Partial<DocumentRenderOptions>) => Promise<void>;
  removeFile: (id: string) => void;
  printDocument: () => Promise<void>;
  reset: () => void;
}
