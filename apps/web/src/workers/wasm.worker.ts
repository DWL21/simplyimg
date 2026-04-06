import type {
  CompressOptions,
  ConvertOptions,
  CropOptions,
  FlipOptions,
  ImageInfo,
  ProcessedImage,
  ResizeOptions,
  RotateOptions,
  ToolName,
  ToolOptions,
} from '../types/image';
import { inferMimeType, mimeFromFormat, preferredRasterMimeType } from '../lib/formatUtils';

type WorkerRequest =
  | { id: string; type: 'info'; file: File }
  | { id: string; type: 'process'; tool: ToolName; file: File; options: ToolOptions };

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;

  try {
    if (message.type === 'info') {
      const result = await getInfo(message.file);
      self.postMessage({ id: message.id, result });
      return;
    }

    const result = await executeTool(message.tool, message.file, message.options);
    self.postMessage({ id: message.id, result });
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown worker error';
    self.postMessage({ id: message.id, error: reason });
  }
};

async function getInfo(file: File): Promise<ImageInfo> {
  const bitmap = await createImageBitmap(file);
  try {
    return {
      width: bitmap.width,
      height: bitmap.height,
      format: inferMimeType(file),
      size: file.size,
    };
  } finally {
    bitmap.close();
  }
}

async function executeTool(tool: ToolName, file: File, options: ToolOptions): Promise<ProcessedImage> {
  switch (tool) {
    case 'compress':
      return compressImage(file, options as CompressOptions);
    case 'resize':
      return resizeImage(file, options as ResizeOptions);
    case 'convert':
      return convertImage(file, options as ConvertOptions);
    case 'rotate':
      return rotateImage(file, options as RotateOptions);
    case 'flip':
      return flipImage(file, options as FlipOptions);
    case 'crop':
      return cropImage(file, options as CropOptions);
  }
}

async function compressImage(file: File, options: CompressOptions): Promise<ProcessedImage> {
  if (options.format === 'svg') {
    return drawToSvg(file, {
      quality: normalizedQuality(options.quality),
      draw(ctx, bitmap) {
        ctx.drawImage(bitmap, 0, 0);
      },
    });
  }

  const mimeType = options.format ? mimeFromFormat(options.format) : preferredRasterMimeType(file);
  return drawToBlob(file, {
    mimeType,
    quality: normalizedQuality(options.quality),
    draw(ctx, bitmap) {
      ctx.drawImage(bitmap, 0, 0);
    },
  });
}

async function resizeImage(file: File, options: ResizeOptions): Promise<ProcessedImage> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = new OffscreenCanvas(options.width, options.height);
    const ctx = getContext(canvas);
    const crop = options.crop;

    if (crop) {
      const sourceX = Math.max(0, Math.min(crop.x, bitmap.width - 1));
      const sourceY = Math.max(0, Math.min(crop.y, bitmap.height - 1));
      const sourceWidth = Math.max(1, Math.min(crop.width, bitmap.width - sourceX));
      const sourceHeight = Math.max(1, Math.min(crop.height, bitmap.height - sourceY));
      ctx.drawImage(bitmap, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, options.width, options.height);
    } else {
      ctx.drawImage(bitmap, 0, 0, options.width, options.height);
    }

    const mimeType = preferredRasterMimeType(file);
    const blob = await canvas.convertToBlob({ type: mimeType });
    return { blob, mimeType: blob.type || mimeType };
  } finally {
    bitmap.close();
  }
}

async function convertImage(file: File, options: ConvertOptions): Promise<ProcessedImage> {
  if (options.to === 'svg') {
    return drawToSvg(file, {
      quality: normalizedQuality(options.quality),
      draw(ctx, bitmap) {
        ctx.drawImage(bitmap, 0, 0);
      },
    });
  }

  return drawToBlob(file, {
    mimeType: mimeFromFormat(options.to),
    quality: normalizedQuality(options.quality),
    draw(ctx, bitmap) {
      ctx.drawImage(bitmap, 0, 0);
    },
  });
}

async function rotateImage(file: File, options: RotateOptions): Promise<ProcessedImage> {
  const bitmap = await createImageBitmap(file);
  try {
    const radians = (options.degrees * Math.PI) / 180;
    const width = Math.abs(bitmap.width * Math.cos(radians)) + Math.abs(bitmap.height * Math.sin(radians));
    const height = Math.abs(bitmap.width * Math.sin(radians)) + Math.abs(bitmap.height * Math.cos(radians));
    const canvas = new OffscreenCanvas(
      Math.max(1, Math.ceil(width)),
      Math.max(1, Math.ceil(height)),
    );
    const ctx = getContext(canvas);
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(radians);
    ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);

    const mimeType = preferredRasterMimeType(file);
    const blob = await canvas.convertToBlob({ type: mimeType });
    return { blob, mimeType: blob.type || mimeType };
  } finally {
    bitmap.close();
  }
}

async function flipImage(file: File, options: FlipOptions): Promise<ProcessedImage> {
  return drawToBlob(file, {
    mimeType: preferredRasterMimeType(file),
    draw(ctx, bitmap) {
      ctx.translate(options.horizontal ? bitmap.width : 0, options.vertical ? bitmap.height : 0);
      ctx.scale(options.horizontal ? -1 : 1, options.vertical ? -1 : 1);
      ctx.drawImage(bitmap, 0, 0);
    },
  });
}

async function cropImage(file: File, options: CropOptions): Promise<ProcessedImage> {
  const bitmap = await createImageBitmap(file);
  try {
    if (options.x >= bitmap.width || options.y >= bitmap.height) {
      throw new Error('Crop origin is outside the image bounds');
    }

    const width = Math.max(1, Math.min(options.width, bitmap.width - options.x));
    const height = Math.max(1, Math.min(options.height, bitmap.height - options.y));
    const canvas = new OffscreenCanvas(width, height);
    const ctx = getContext(canvas);
    ctx.drawImage(bitmap, options.x, options.y, width, height, 0, 0, width, height);

    const mimeType = preferredRasterMimeType(file);
    const blob = await canvas.convertToBlob({ type: mimeType });
    return { blob, mimeType: blob.type || mimeType };
  } finally {
    bitmap.close();
  }
}

function normalizedQuality(value: number | undefined) {
  return typeof value === 'number' ? Math.min(1, Math.max(0, value / 100)) : undefined;
}

function getContext(canvas: OffscreenCanvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context is unavailable');
  }

  return ctx;
}

async function drawToBlob(
  file: File,
  config: {
    mimeType: string;
    quality?: number;
    draw: (ctx: OffscreenCanvasRenderingContext2D, bitmap: ImageBitmap) => void;
  },
): Promise<ProcessedImage> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = getContext(canvas);
    config.draw(ctx, bitmap);
    const blob = await canvas.convertToBlob({
      type: config.mimeType,
      quality: config.quality,
    });

    return {
      blob,
      mimeType: blob.type || config.mimeType,
    };
  } finally {
    bitmap.close();
  }
}

async function drawToSvg(
  file: File,
  config: {
    quality?: number;
    draw: (ctx: OffscreenCanvasRenderingContext2D, bitmap: ImageBitmap) => void;
  },
): Promise<ProcessedImage> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = getContext(canvas);
    config.draw(ctx, bitmap);
    const rasterMime = preferredRasterMimeType(file);
    const blob = await canvas.convertToBlob({
      type: rasterMime,
      quality: config.quality,
    });

    return wrapBlobAsSvg(blob, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}

async function wrapBlobAsSvg(blob: Blob, width: number, height: number): Promise<ProcessedImage> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }

  const base64 = btoa(binary);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><image href="data:${blob.type};base64,${base64}" width="${width}" height="${height}" preserveAspectRatio="none"/></svg>`;
  return {
    blob: new Blob([svg], { type: 'image/svg+xml' }),
    mimeType: 'image/svg+xml',
  };
}
