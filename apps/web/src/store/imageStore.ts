import JSZip from 'jszip';
import { create } from 'zustand';
import { createImageUrl, revokeImageUrl } from '../lib/canvasUtils';
import { bytesToHuman, extensionFromMime, inferMimeType } from '../lib/formatUtils';
import { wasmClient } from '../lib/wasmClient';
import type { ImageStoreState, ProcessedResult, ToolName, ToolOptions } from '../types/image';

function makeId() {
  return crypto.randomUUID();
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadUrl(url: string, filename: string) {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
}

function deriveResultName(file: File, mimeType: string) {
  const base = file.name.replace(/\.[^.]+$/, '');
  return `${base}.${extensionFromMime(mimeType)}`;
}

export const useImageStore = create<ImageStoreState>((set, get) => ({
  files: [],
  results: [],
  isProcessing: false,
  progress: 0,
  error: null,
  activeTool: 'compress',
  addFiles(files) {
    get().results.forEach((result) => URL.revokeObjectURL(result.url));
    set((state) => ({
      files: [
        ...state.files,
        ...files.map((file) => ({
          id: makeId(),
          file,
          previewUrl: createImageUrl(file),
        })),
      ],
      results: [],
      error: null,
    }));
  },
  removeFile(id) {
    set((state) => {
      const target = state.files.find((file) => file.id === id);
      if (target) {
        revokeImageUrl(target.previewUrl);
      }
      state.results
        .filter((result) => result.sourceFileId === id)
        .forEach((result) => URL.revokeObjectURL(result.url));
      return {
        files: state.files.filter((file) => file.id !== id),
        results: state.results.filter((result) => result.sourceFileId !== id),
      };
    });
  },
  setActiveTool(tool) {
    set({ activeTool: tool });
  },
  async processAll(tool, options) {
    const files = get().files;
    if (files.length === 0) {
      set({ error: 'Upload at least one image before processing.' });
      return;
    }

    set({ isProcessing: true, progress: 0, error: null });

    try {
      get().results.forEach((result) => URL.revokeObjectURL(result.url));
      const nextResults: ProcessedResult[] = [];
      for (let index = 0; index < files.length; index += 1) {
        const uploaded = files[index];
        const processed = await wasmClient.process(tool, uploaded.file, options);
        const blob = processed.blob;
        const mimeType = processed.mimeType || inferMimeType(uploaded.file);
        const url = URL.createObjectURL(blob);
        nextResults.push({
          id: makeId(),
          name: deriveResultName(uploaded.file, mimeType),
          mimeType,
          size: blob.size,
          url,
          sourceFileId: uploaded.id,
        });

        set({ progress: Math.round(((index + 1) / files.length) * 100) });
      }

      set({ results: nextResults, isProcessing: false, progress: 100 });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Processing failed.';
      set({ isProcessing: false, error: message });
    }
  },
  downloadSingle(index) {
    const result = get().results[index];
    if (!result) {
      return;
    }

    downloadUrl(result.url, result.name);
  },
  async downloadAll() {
    const { results } = get();
    if (results.length === 0) {
      return;
    }

    const zip = new JSZip();
    for (const result of results) {
      const response = await fetch(result.url);
      zip.file(result.name, await response.arrayBuffer());
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, `simplyimg-${bytesToHuman(blob.size)}.zip`);
  },
  reset() {
    get().files.forEach((file) => revokeImageUrl(file.previewUrl));
    get().results.forEach((result) => URL.revokeObjectURL(result.url));
    set({
      files: [],
      results: [],
      isProcessing: false,
      progress: 0,
      error: null,
    });
  },
}));

export function setActiveTool(tool: ToolName) {
  useImageStore.getState().setActiveTool(tool);
}

export function processImages(tool: ToolName, options: ToolOptions) {
  return useImageStore.getState().processAll(tool, options);
}
