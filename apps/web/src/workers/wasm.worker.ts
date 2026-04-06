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
import { inferMimeType, mimeFromFormat } from '../lib/formatUtils';

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
  const mimeType = options.format ? mimeFromFormat(options.format) : inferMimeType(file);
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
    const sourceWidth = bitmap.width;
    const sourceHeight = bitmap.height;
    const scaleX = options.width / sourceWidth;
    const scaleY = options.height / sourceHeight;
    const fit = options.fit ?? 'contain';

    let drawWidth = options.width;
    let drawHeight = options.height;
    let offsetX = 0;
    let offsetY = 0;

    if (fit === 'contain') {
      const scale = Math.min(scaleX, scaleY);
      drawWidth = Math.max(1, Math.round(sourceWidth * scale));
      drawHeight = Math.max(1, Math.round(sourceHeight * scale));
      offsetX = Math.floor((options.width - drawWidth) / 2);
      offsetY = Math.floor((options.height - drawHeight) / 2);
    } else if (fit === 'cover') {
      const scale = Math.max(scaleX, scaleY);
      drawWidth = Math.max(1, Math.round(sourceWidth * scale));
      drawHeight = Math.max(1, Math.round(sourceHeight * scale));
      offsetX = Math.floor((options.width - drawWidth) / 2);
      offsetY = Math.floor((options.height - drawHeight) / 2);
    }

    const canvas = new OffscreenCanvas(options.width, options.height);
    const ctx = getContext(canvas);
    ctx.drawImage(bitmap, offsetX, offsetY, drawWidth, drawHeight);
    const blob = await canvas.convertToBlob({ type: inferMimeType(file) });
    return { blob, mimeType: blob.type || inferMimeType(file) };
  } finally {
    bitmap.close();
  }
}

async function convertImage(file: File, options: ConvertOptions): Promise<ProcessedImage> {
  if (options.to === 'gif') {
    throw new Error('GIF conversion is not supported in the browser worker yet');
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
    const swapSides = options.degrees === 90 || options.degrees === 270;
    const canvas = new OffscreenCanvas(
      swapSides ? bitmap.height : bitmap.width,
      swapSides ? bitmap.width : bitmap.height,
    );
    const ctx = getContext(canvas);
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((options.degrees * Math.PI) / 180);
    ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);

    const blob = await canvas.convertToBlob({ type: inferMimeType(file) });
    return { blob, mimeType: blob.type || inferMimeType(file) };
  } finally {
    bitmap.close();
  }
}

async function flipImage(file: File, options: FlipOptions): Promise<ProcessedImage> {
  return drawToBlob(file, {
    mimeType: inferMimeType(file),
    draw(ctx, bitmap) {
      ctx.translate(options.horizontal ? bitmap.width : 0, options.horizontal ? 0 : bitmap.height);
      ctx.scale(options.horizontal ? -1 : 1, options.horizontal ? 1 : -1);
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

    const blob = await canvas.convertToBlob({ type: inferMimeType(file) });
    return { blob, mimeType: blob.type || inferMimeType(file) };
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
