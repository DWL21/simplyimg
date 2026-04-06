export type ToolName =
  | "compress"
  | "resize"
  | "convert"
  | "rotate"
  | "flip"
  | "crop";

export type ImageFormat = "jpeg" | "png" | "webp" | "gif";
export type ResizeFit = "contain" | "cover" | "exact";

export interface ImageInfo {
  width: number;
  height: number;
  format: ImageFormat | "unknown";
  size: number;
}

export interface CompressOptions {
  quality?: number;
  format?: ImageFormat;
}

export interface ResizeOptions {
  width: number;
  height: number;
  fit?: ResizeFit;
}

export interface ConvertOptions {
  to: ImageFormat;
  quality?: number;
}

export interface RotateOptions {
  degrees: 90 | 180 | 270;
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

export interface ApiErrorPayload {
  error: string;
  code: string;
}

export interface MultipartPayload {
  file: File;
  options?: string;
}
