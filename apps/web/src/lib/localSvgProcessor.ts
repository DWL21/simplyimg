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
import { inferMimeType, mimeFromFormat, preferredRasterMimeType } from './formatUtils';
import { optimizeSvgFile } from './svgOptimizer';

interface CanvasContextLike {
  drawImage: (...args: unknown[]) => void;
  translate: (x: number, y: number) => void;
  rotate: (angle: number) => void;
  scale: (x: number, y: number) => void;
}

interface CanvasLike {
  width: number;
  height: number;
  getContext: (contextId: '2d') => CanvasContextLike | null;
  toBlob: (callback: (blob: Blob | null) => void, type?: string, quality?: number) => void;
}

interface ImageLike {
  onload: (() => void) | null;
  onerror: (() => void) | null;
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  width: number;
  height: number;
}

function normalizeQuality(value: number | undefined) {
  return typeof value === 'number' ? Math.min(1, Math.max(0, value / 100)) : undefined;
}

function createCanvas(width: number, height: number) {
  const canvas = (globalThis as unknown as { document: { createElement: (tag: 'canvas') => CanvasLike } })
    .document
    .createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(width));
  canvas.height = Math.max(1, Math.ceil(height));

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context is unavailable');
  }

  return { canvas, ctx };
}

async function canvasToBlob(canvas: CanvasLike, mimeType: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob: Blob | null) => {
        if (!blob) {
          reject(new Error('Canvas export failed'));
          return;
        }

        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}

async function loadSvgImage(file: File) {
  const url = URL.createObjectURL(file);

  try {
    const image = await new Promise<ImageLike>((resolve, reject) => {
      const element = new (globalThis as unknown as { Image: new () => ImageLike }).Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Failed to load SVG image'));
      element.src = url;
    });

    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function renderBaseCanvas(image: ImageLike) {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;

  if (!width || !height) {
    throw new Error('SVG image has invalid dimensions');
  }

  const { canvas, ctx } = createCanvas(width, height);
  ctx.drawImage(image, 0, 0, width, height);
  return { canvas, ctx, width, height };
}

async function exportRasterCanvas(
  canvas: CanvasLike,
  mimeType: string,
  quality?: number,
): Promise<ProcessedImage> {
  const blob = await canvasToBlob(canvas, mimeType, quality);
  return {
    blob,
    mimeType: blob.type || mimeType,
  };
}

export async function getSvgInfo(file: File): Promise<ImageInfo> {
  const image = await loadSvgImage(file);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;

  if (!width || !height) {
    throw new Error('SVG image has invalid dimensions');
  }

  return {
    width,
    height,
    format: inferMimeType(file),
    size: file.size,
  };
}

export async function processSvgLocally(
  tool: ToolName,
  file: File,
  options: ToolOptions,
): Promise<ProcessedImage> {
  switch (tool) {
    case 'compress': {
      const compressOptions = options as CompressOptions;
      if (!compressOptions.format || compressOptions.format === 'svg') {
        return optimizeSvgFile(file, compressOptions.quality);
      }

      const image = await loadSvgImage(file);
      const base = renderBaseCanvas(image);
      const mimeType = compressOptions.format
        ? mimeFromFormat(compressOptions.format)
        : preferredRasterMimeType(file);
      return exportRasterCanvas(base.canvas, mimeType, normalizeQuality(compressOptions.quality));
    }

    case 'convert': {
      const convertOptions = options as ConvertOptions;
      if (convertOptions.to === 'svg') {
        return optimizeSvgFile(file, convertOptions.quality);
      }

      const image = await loadSvgImage(file);
      const base = renderBaseCanvas(image);
      return exportRasterCanvas(
        base.canvas,
        mimeFromFormat(convertOptions.to),
        normalizeQuality(convertOptions.quality),
      );
    }

    case 'resize': {
      const resizeOptions = options as ResizeOptions;
      const image = await loadSvgImage(file);
      const base = renderBaseCanvas(image);
      const { canvas, ctx } = createCanvas(resizeOptions.width, resizeOptions.height);
      const crop = resizeOptions.crop;

      if (crop) {
        const sourceX = Math.max(0, Math.min(crop.x, base.width - 1));
        const sourceY = Math.max(0, Math.min(crop.y, base.height - 1));
        const sourceWidth = Math.max(1, Math.min(crop.width, base.width - sourceX));
        const sourceHeight = Math.max(1, Math.min(crop.height, base.height - sourceY));
        ctx.drawImage(
          base.canvas,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          resizeOptions.width,
          resizeOptions.height,
        );
      } else {
        ctx.drawImage(base.canvas, 0, 0, resizeOptions.width, resizeOptions.height);
      }

      return exportRasterCanvas(canvas, preferredRasterMimeType(file));
    }

    case 'rotate': {
      const rotateOptions = options as RotateOptions;
      const image = await loadSvgImage(file);
      const base = renderBaseCanvas(image);
      const radians = (rotateOptions.degrees * Math.PI) / 180;
      const width = Math.abs(base.width * Math.cos(radians)) + Math.abs(base.height * Math.sin(radians));
      const height = Math.abs(base.width * Math.sin(radians)) + Math.abs(base.height * Math.cos(radians));
      const { canvas, ctx } = createCanvas(width, height);
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(radians);
      ctx.drawImage(base.canvas, -base.width / 2, -base.height / 2);
      return exportRasterCanvas(canvas, preferredRasterMimeType(file));
    }

    case 'flip': {
      const flipOptions = options as FlipOptions;
      const image = await loadSvgImage(file);
      const base = renderBaseCanvas(image);
      const { canvas, ctx } = createCanvas(base.width, base.height);
      ctx.translate(flipOptions.horizontal ? base.width : 0, flipOptions.vertical ? base.height : 0);
      ctx.scale(flipOptions.horizontal ? -1 : 1, flipOptions.vertical ? -1 : 1);
      ctx.drawImage(base.canvas, 0, 0);
      return exportRasterCanvas(canvas, preferredRasterMimeType(file));
    }

    case 'crop': {
      const cropOptions = options as CropOptions;
      const image = await loadSvgImage(file);
      const base = renderBaseCanvas(image);
      if (cropOptions.x >= base.width || cropOptions.y >= base.height) {
        throw new Error('Crop origin is outside the image bounds');
      }

      const width = Math.max(1, Math.min(cropOptions.width, base.width - cropOptions.x));
      const height = Math.max(1, Math.min(cropOptions.height, base.height - cropOptions.y));
      const { canvas, ctx } = createCanvas(width, height);
      ctx.drawImage(base.canvas, cropOptions.x, cropOptions.y, width, height, 0, 0, width, height);
      return exportRasterCanvas(canvas, preferredRasterMimeType(file));
    }
  }
}
