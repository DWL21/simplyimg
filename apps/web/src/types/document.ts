export type DocumentToolName = 'pdf';

export interface UploadedDocument {
  id: string;
  file: File;
}

export interface DocumentResult {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  url: string;
  sourceFileId: string;
}

export interface ProcessedDocument {
  blob: Blob;
  mimeType: string;
}

export interface DocumentStoreState {
  files: UploadedDocument[];
  results: DocumentResult[];
  isProcessing: boolean;
  progress: number;
  error: string | null;
  addFiles: (files: File[]) => void;
  removeFile: (id: string) => void;
  processAll: () => Promise<void>;
  downloadSingle: (index: number) => void;
  downloadAll: () => Promise<void>;
  reset: () => void;
}
