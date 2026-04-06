export type ToolName = 'compress' | 'resize' | 'convert' | 'rotate' | 'crop' | 'flip';
export type OutputFormat = 'jpeg' | 'png' | 'webp' | 'gif';

export interface UploadedFile {
  id: string;
  file: File;
  originalFile: File;
  previewUrl: string;
  originalPreviewUrl: string;
}

export interface ProcessedResult {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  url: string;
  sourceFileId: string;
  sourceSize: number;
}

export interface ImageInfo {
  width: number;
  height: number;
  format: string;
  size: number;
}

export interface ProcessedImage {
  blob: Blob;
  mimeType: string;
}

export interface CompressOptions {
  quality: number;
  format?: OutputFormat;
}

export interface ResizeOptions {
  width: number;
  height: number;
}

export interface ConvertOptions {
  to: OutputFormat;
  quality: number;
}

export interface RotateOptions {
  degrees: 0 | 90 | 180 | 270;
}

export interface FlipOptions {
  horizontal: boolean;
}

export interface CropOptions {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ToolOptions =
  | CompressOptions
  | ResizeOptions
  | ConvertOptions
  | RotateOptions
  | FlipOptions
  | CropOptions;

export interface ImageStoreState {
  files: UploadedFile[];
  results: ProcessedResult[];
  isProcessing: boolean;
  progress: number;
  error: string | null;
  activeTool: ToolName;
  addFiles: (files: File[]) => void;
  removeFile: (id: string) => void;
  setActiveTool: (tool: ToolName) => void;
  processAll: (tool: ToolName, options: ToolOptions) => Promise<void>;
  resetFile: (id: string) => void;
  downloadSingle: (index: number) => void;
  downloadAll: () => Promise<void>;
  reset: () => void;
}
