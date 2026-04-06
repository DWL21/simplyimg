import { ApiError } from "./errors";
import type {
  CompressOptions,
  ConvertOptions,
  CropOptions,
  DocumentFormat,
  FlipOptions,
  ImageFormat,
  MultipartPayload,
  ResizeOptions,
  RotateOptions,
  ToolName,
} from "./types";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_DOCUMENT_UPLOAD_BYTES = 25 * 1024 * 1024;
const SUPPORTED_FORMATS: ImageFormat[] = ["jpeg", "png", "webp", "gif"];
const SUPPORTED_DOCUMENT_FORMATS: DocumentFormat[] = ["md", "docx"];

export const parseMultipart = async (request: Request): Promise<MultipartPayload> => {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    throw new ApiError("INVALID_REQUEST", "Expected multipart/form-data request");
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const options = formData.get("options");

  if (!(file instanceof File)) {
    throw new ApiError("MISSING_FILE", "Missing file field");
  }

  if (file.size <= 0) {
    throw new ApiError("EMPTY_FILE", "Uploaded file is empty");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ApiError("FILE_TOO_LARGE", `File exceeds ${MAX_UPLOAD_BYTES} bytes`);
  }

  return {
    file,
    options: typeof options === "string" && options.trim().length > 0 ? options : undefined,
  };
};

export const parseFileMultipart = async (request: Request): Promise<File> => {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    throw new ApiError("INVALID_REQUEST", "Expected multipart/form-data request");
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new ApiError("MISSING_FILE", "Missing file field");
  }

  if (file.size <= 0) {
    throw new ApiError("EMPTY_FILE", "Uploaded file is empty");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ApiError("FILE_TOO_LARGE", `File exceeds ${MAX_UPLOAD_BYTES} bytes`);
  }

  return file;
};

export const parseDocumentMultipart = async (request: Request): Promise<File> => {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    throw new ApiError("INVALID_REQUEST", "Expected multipart/form-data request");
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new ApiError("MISSING_FILE", "Missing file field");
  }

  if (file.size <= 0) {
    throw new ApiError("EMPTY_FILE", "Uploaded file is empty");
  }

  if (file.size > MAX_DOCUMENT_UPLOAD_BYTES) {
    throw new ApiError("FILE_TOO_LARGE", `File exceeds ${MAX_DOCUMENT_UPLOAD_BYTES} bytes`);
  }

  return file;
};

const parseJsonOptions = <T>(options: string, tool: ToolName): T => {
  try {
    return JSON.parse(options) as T;
  } catch {
    throw new ApiError("INVALID_OPTIONS", `Invalid JSON options for ${tool}`);
  }
};

const requireNumber = (value: unknown, field: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ApiError("INVALID_OPTIONS", `Invalid ${field}`);
  }

  return value;
};

const requirePositiveNumber = (value: unknown, field: string): number => {
  const parsed = requireNumber(value, field);
  if (parsed <= 0) {
    throw new ApiError("INVALID_OPTIONS", `${field} must be greater than zero`);
  }

  return parsed;
};

const requireNonNegativeNumber = (value: unknown, field: string): number => {
  const parsed = requireNumber(value, field);
  if (parsed < 0) {
    throw new ApiError("INVALID_OPTIONS", `${field} must be zero or greater`);
  }

  return parsed;
};

const requireBoolean = (value: unknown, field: string): boolean => {
  if (typeof value !== "boolean") {
    throw new ApiError("INVALID_OPTIONS", `Invalid ${field}`);
  }

  return value;
};

const requireFormat = (value: unknown, field: string): ImageFormat => {
  if (typeof value !== "string" || !SUPPORTED_FORMATS.includes(value as ImageFormat)) {
    throw new ApiError("INVALID_OPTIONS", `Invalid ${field}`);
  }

  return value as ImageFormat;
};

export const parseCompressOptions = (options: string): CompressOptions => {
  const parsed = parseJsonOptions<Record<string, unknown>>(options, "compress");
  return {
    quality:
      parsed.quality === undefined
        ? undefined
        : (() => {
            const quality = requireNumber(parsed.quality, "quality");
            if (quality < 0 || quality > 100) {
              throw new ApiError("INVALID_OPTIONS", "quality must be between 0 and 100");
            }
            return quality;
          })(),
    format: parsed.format === undefined ? undefined : requireFormat(parsed.format, "format"),
  };
};

export const parseResizeOptions = (options: string): ResizeOptions => {
  const parsed = parseJsonOptions<Record<string, unknown>>(options, "resize");
  return {
    width: requirePositiveNumber(parsed.width, "width"),
    height: requirePositiveNumber(parsed.height, "height"),
    fit:
      parsed.fit === undefined
        ? "contain"
        : parsed.fit === "contain" || parsed.fit === "cover" || parsed.fit === "exact"
          ? parsed.fit
          : (() => {
              throw new ApiError("INVALID_OPTIONS", "Invalid fit");
            })(),
  };
};

export const parseConvertOptions = (options: string): ConvertOptions => {
  const parsed = parseJsonOptions<Record<string, unknown>>(options, "convert");
  return {
    to: requireFormat(parsed.to, "to"),
    quality:
      parsed.quality === undefined
        ? undefined
        : (() => {
            const quality = requireNumber(parsed.quality, "quality");
            if (quality < 0 || quality > 100) {
              throw new ApiError("INVALID_OPTIONS", "quality must be between 0 and 100");
            }
            return quality;
          })(),
  };
};

export const parseRotateOptions = (options: string): RotateOptions => {
  const parsed = parseJsonOptions<Record<string, unknown>>(options, "rotate");
  const degrees = requireNumber(parsed.degrees, "degrees");
  if (degrees !== 90 && degrees !== 180 && degrees !== 270) {
    throw new ApiError("INVALID_OPTIONS", "degrees must be 90, 180, or 270");
  }

  return { degrees: degrees as 90 | 180 | 270 };
};

export const parseFlipOptions = (options: string): FlipOptions => {
  const parsed = parseJsonOptions<Record<string, unknown>>(options, "flip");
  return { horizontal: requireBoolean(parsed.horizontal, "horizontal") };
};

export const parseCropOptions = (options: string): CropOptions => {
  const parsed = parseJsonOptions<Record<string, unknown>>(options, "crop");
  return {
    x: requireNonNegativeNumber(parsed.x, "x"),
    y: requireNonNegativeNumber(parsed.y, "y"),
    width: requirePositiveNumber(parsed.width, "width"),
    height: requirePositiveNumber(parsed.height, "height"),
  };
};

export const requireOptions = (options: string | undefined, tool: ToolName): string => {
  if (!options) {
    throw new ApiError("MISSING_OPTIONS", `Missing options field for ${tool}`);
  }

  return options;
};

export const requireDocumentFormat = (format: DocumentFormat | null): DocumentFormat => {
  if (!format || !SUPPORTED_DOCUMENT_FORMATS.includes(format)) {
    throw new ApiError("UNSUPPORTED_DOCUMENT", "Only md and docx files can be converted to PDF");
  }

  return format;
};
