export interface UploadedDocument {
  id: string;
  file: File;
}

export interface DocumentStoreState {
  files: UploadedDocument[];
  previewHtml: string | null;
  printHtml: string | null;
  isProcessing: boolean;
  progress: number;
  error: string | null;
  addFiles: (files: File[]) => Promise<void>;
  removeFile: (id: string) => void;
  printDocument: () => Promise<void>;
  reset: () => void;
}
