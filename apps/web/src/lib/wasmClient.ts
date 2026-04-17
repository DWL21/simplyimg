import type { ImageInfo, ProcessedImage, ToolName, ToolOptions } from '../types/image';
import { inferMimeType, isSvgFile } from './formatUtils';
import { getSvgInfo, processSvgLocally } from './localSvgProcessor';
import { postToWorker } from './workerClient';

export interface WasmClient {
  isReady: boolean;
  getInfo: (file: File) => Promise<ImageInfo>;
  process: (tool: ToolName, file: File, options: ToolOptions) => Promise<ProcessedImage>;
}

const noopInfo: ImageInfo = {
  width: 0,
  height: 0,
  format: 'unknown',
  size: 0,
};

import WasmWorker from '../workers/wasm.worker.ts?worker';

let worker: Worker | null = null;

function getWorker() {
  if (!worker) {
    worker = new WasmWorker();
  }

  return worker;
}

function postToBrowserWorker<T>(message: Record<string, unknown>) {
  const activeWorker = getWorker();

  return new Promise<T>((resolve, reject) => {
    const id = crypto.randomUUID();

    const handleMessage = (event: MessageEvent) => {
      const payload = event.data as { id?: string; error?: string; result?: T };
      if (payload.id !== id) {
        return;
      }

      activeWorker.removeEventListener('message', handleMessage);

      if (payload.error) {
        reject(new Error(payload.error));
        return;
      }

      resolve(payload.result as T);
    };

    activeWorker.addEventListener('message', handleMessage);
    activeWorker.postMessage({ id, ...message });
  });
}

function isHeicFile(file: File): boolean {
  const mimeType = inferMimeType(file);
  return mimeType === 'image/heic' || mimeType === 'image/heif';
}

async function convertHeicToRaster(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');
    ctx.drawImage(bitmap, 0, 0);
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    const name = file.name.replace(/\.hei[cf]$/i, '.png');
    return new File([blob], name, { type: 'image/png' });
  } finally {
    bitmap.close();
  }
}

export function createWasmClient(): WasmClient {
  return {
    isReady:
      typeof Worker !== 'undefined' &&
      typeof OffscreenCanvas !== 'undefined' &&
      typeof createImageBitmap !== 'undefined',
    async getInfo(file) {
      if (isSvgFile(file)) {
        try {
          return await getSvgInfo(file);
        } catch {
          return {
            ...noopInfo,
            format: file.type || 'image/svg+xml',
            size: file.size,
          };
        }
      }

      try {
        return await postToBrowserWorker<ImageInfo>({ type: 'info', file });
      } catch {
        return {
          ...noopInfo,
          format: file.type || 'unknown',
          size: file.size,
        };
      }
    },
    async process(tool, file, options) {
      if (isSvgFile(file)) {
        return processSvgLocally(tool, file, options);
      }

      let processableFile = file;
      if (isHeicFile(file) && typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap !== 'undefined') {
        try {
          processableFile = await convertHeicToRaster(file);
        } catch {
          // Browser can't decode HEIC — will try remote worker as-is
        }
      }

      if (this.isReady) {
        try {
          return await postToBrowserWorker<ProcessedImage>({ type: 'process', tool, file: processableFile, options });
        } catch {
          // Fall back to the remote worker when browser processing fails.
        }
      }

      return postToWorker(tool, processableFile, options);
    },
  };
}

export const wasmClient = createWasmClient();
