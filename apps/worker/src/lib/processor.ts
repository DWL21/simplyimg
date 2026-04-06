import initWasm, {
  compress as wasmCompress,
  convert as wasmConvert,
  crop as wasmCrop,
  flip as wasmFlip,
  get_info as wasmGetInfo,
  resize as wasmResize,
  rotate as wasmRotate,
} from "../../../../packages/img-processor/pkg/img_processor.js";
import wasmModule from "../../../../packages/img-processor/pkg/img_processor_bg.wasm";
import { ApiError } from "./errors";
import type {
  CompressOptions,
  ConvertOptions,
  CropOptions,
  FlipOptions,
  ImageInfo,
  ImageFormat,
  ResizeOptions,
  RotateOptions,
} from "./types";

export interface ImageProcessor {
  info(input: Uint8Array): Promise<ImageInfo>;
  compress(input: Uint8Array, options: CompressOptions): Promise<Uint8Array>;
  resize(input: Uint8Array, options: ResizeOptions): Promise<Uint8Array>;
  convert(input: Uint8Array, options: ConvertOptions): Promise<Uint8Array>;
  rotate(input: Uint8Array, options: RotateOptions): Promise<Uint8Array>;
  flip(input: Uint8Array, options: FlipOptions): Promise<Uint8Array>;
  crop(input: Uint8Array, options: CropOptions): Promise<Uint8Array>;
}

const wasmReady = initWasm(wasmModule);

const detectFormat = (input: Uint8Array): ImageFormat | "unknown" => {
  if (input.length >= 3 && input[0] === 0xff && input[1] === 0xd8 && input[2] === 0xff) {
    return "jpeg";
  }

  if (
    input.length >= 8 &&
    input[0] === 0x89 &&
    input[1] === 0x50 &&
    input[2] === 0x4e &&
    input[3] === 0x47
  ) {
    return "png";
  }

  if (input.length >= 4) {
    const header = new TextDecoder().decode(input.slice(0, 4));
    if (header === "RIFF") {
      return "webp";
    }
    if (header.startsWith("GIF")) {
      return "gif";
    }
  }

  return "unknown";
};

const normalizeFormat = (format: ImageFormat | "unknown"): ImageFormat =>
  format === "unknown" ? "png" : format;

const toImageFormat = (format: string | undefined): ImageFormat | "unknown" => {
  switch (format) {
    case "jpeg":
    case "png":
    case "webp":
    case "gif":
      return format;
    default:
      return "unknown";
  }
};

const normalizeQuality = (quality: number | undefined, fallback: number) =>
  Math.max(0, Math.min(100, Math.round(quality ?? fallback)));

const toUint8Array = (value: Uint8Array): Uint8Array => {
  const next = new Uint8Array(value.byteLength);
  next.set(value);
  return next;
};

const wrapWasmError = (error: unknown): never => {
  const message = error instanceof Error ? error.message : String(error);
  throw new ApiError("PROCESSING_FAILED", message, 400);
};

export const createImageProcessor = (): ImageProcessor => ({
  async info(input) {
    try {
      await wasmReady;
      const parsed = wasmGetInfo(toUint8Array(input)) as {
        width?: number;
        height?: number;
        format?: string;
      };

      return {
        width: parsed.width ?? 0,
        height: parsed.height ?? 0,
        format: toImageFormat(parsed.format) === "unknown" ? detectFormat(input) : toImageFormat(parsed.format),
        size: input.byteLength,
      };
    } catch (error) {
      return wrapWasmError(error);
    }
  },
  async compress(input, options) {
    try {
      await wasmReady;
      const format = options.format ?? normalizeFormat(detectFormat(input));
      return wasmCompress(toUint8Array(input), format, normalizeQuality(options.quality, 80));
    } catch (error) {
      return wrapWasmError(error);
    }
  },
  async resize(input, options) {
    try {
      await wasmReady;
      return wasmResize(
        toUint8Array(input),
        Math.round(options.width),
        Math.round(options.height),
        options.fit ?? "contain",
      );
    } catch (error) {
      return wrapWasmError(error);
    }
  },
  async convert(input, options) {
    try {
      await wasmReady;
      return wasmConvert(toUint8Array(input), options.to, normalizeQuality(options.quality, 85));
    } catch (error) {
      return wrapWasmError(error);
    }
  },
  async rotate(input, options) {
    try {
      await wasmReady;
      return wasmRotate(toUint8Array(input), options.degrees);
    } catch (error) {
      return wrapWasmError(error);
    }
  },
  async flip(input, options) {
    try {
      await wasmReady;
      if (options.horizontal && options.vertical) {
        return wasmRotate(toUint8Array(input), 180);
      }

      if (options.horizontal) {
        return wasmFlip(toUint8Array(input), true);
      }

      if (options.vertical) {
        return wasmFlip(toUint8Array(input), false);
      }

      return toUint8Array(input);
    } catch (error) {
      return wrapWasmError(error);
    }
  },
  async crop(input, options) {
    try {
      await wasmReady;
      return wasmCrop(
        toUint8Array(input),
        Math.round(options.x),
        Math.round(options.y),
        Math.round(options.width),
        Math.round(options.height),
      );
    } catch (error) {
      return wrapWasmError(error);
    }
  },
});
