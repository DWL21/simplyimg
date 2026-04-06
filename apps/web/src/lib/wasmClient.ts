import type { ImageInfo, ProcessedImage, ToolName, ToolOptions } from '../types/image';
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

export function createWasmClient(): WasmClient {
  return {
    isReady:
      typeof Worker !== 'undefined' &&
      typeof OffscreenCanvas !== 'undefined' &&
      typeof createImageBitmap !== 'undefined',
    async getInfo(file) {
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
      if (this.isReady) {
        try {
          return await postToBrowserWorker<ProcessedImage>({ type: 'process', tool, file, options });
        } catch {
          // Fall back to the remote worker when browser processing fails.
        }
      }

      return postToWorker(tool, file, options);
    },
  };
}

export const wasmClient = createWasmClient();
