import JSZip from 'jszip';
import { create } from 'zustand';
import { createImageUrl, revokeImageUrl } from '../lib/canvasUtils';
import {
  bytesToHuman,
  extensionFromFormat,
  extensionFromMime,
  inferMimeType,
  isSupportedImageFile,
} from '../lib/formatUtils';
import {
  createEmptyFileError,
  createImageFileTooLargeError,
  createImageProcessingError,
  createProcessFailureSummary,
  createUnsupportedImageFileError,
  createUploadRejectionSummary,
  normalizeUiError,
} from '../lib/uiErrors';
import { getImageUploadLimitBytes } from '../lib/uploadLimits';
import { wasmClient } from '../lib/wasmClient';
import type { ImageStoreState, ProcessedResult, ToolName, ToolOptions, UploadedFile } from '../types/image';

function makeId() {
  return crypto.randomUUID();
}

function normalizeDegrees(value: number) {
  const normalized = Math.round(value) % 360;
  return normalized < 0 ? normalized + 360 : normalized;
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

function deriveResultName(file: File, mimeType: string, extOverride?: string) {
  const base = file.name.replace(/\.[^.]+$/, '');
  return `${base}.${extOverride ?? extensionFromMime(mimeType)}`;
}

function createProcessedFile(blob: Blob, filename: string, mimeType: string) {
  return new File([blob], filename, {
    type: mimeType,
    lastModified: Date.now(),
  });
}

function revokeUploadedFileUrls(file: { previewUrl: string; originalPreviewUrl: string }) {
  if (file.previewUrl !== file.originalPreviewUrl) {
    revokeImageUrl(file.previewUrl);
  }

  revokeImageUrl(file.originalPreviewUrl);
}

function createUploadedFile(file: File): UploadedFile {
  const previewUrl = createImageUrl(file);
  return {
    id: makeId(),
    file,
    originalFile: file,
    previewUrl,
    originalPreviewUrl: previewUrl,
    committedRotateDegrees: 0,
    committedFlipHorizontal: false,
    committedFlipVertical: false,
  };
}

function validateImageFile(file: File) {
  if (!isSupportedImageFile(file)) {
    return createUnsupportedImageFileError(file);
  }

  if (file.size <= 0) {
    return createEmptyFileError(file);
  }

  if (file.size > getImageUploadLimitBytes()) {
    return createImageFileTooLargeError(file);
  }

  return null;
}

function omitFileError<T>(fileErrors: Record<string, T>, id: string) {
  const next = { ...fileErrors };
  delete next[id];
  return next;
}

export const useImageStore = create<ImageStoreState>((set, get) => ({
  files: [],
  results: [],
  isProcessing: false,
  progress: 0,
  error: null,
  uploadErrors: [],
  fileErrors: {},
  activeTool: 'compress',
  addFiles(files) {
    const acceptedFiles: File[] = [];
    const rejectedErrors = files
      .map((file) => {
        const validationError = validateImageFile(file);
        if (!validationError) {
          acceptedFiles.push(file);
        }
        return validationError;
      })
      .filter((error): error is NonNullable<typeof error> => error !== null);

    if (acceptedFiles.length > 0) {
      get().results.forEach((result) => URL.revokeObjectURL(result.url));
      set((state) => ({
        files: [...state.files, ...acceptedFiles.map(createUploadedFile)],
        results: [],
        error: rejectedErrors.length > 0 ? createUploadRejectionSummary(rejectedErrors) : null,
        uploadErrors: rejectedErrors,
        fileErrors: {},
      }));
      return;
    }

    if (rejectedErrors.length > 0) {
      set({
        error: createUploadRejectionSummary(rejectedErrors),
        uploadErrors: rejectedErrors,
      });
    }
  },
  removeFile(id) {
    set((state) => {
      const target = state.files.find((file) => file.id === id);
      if (target) {
        revokeUploadedFileUrls(target);
      }
      state.results
        .filter((result) => result.sourceFileId === id)
        .forEach((result) => URL.revokeObjectURL(result.url));
      return {
        files: state.files.filter((file) => file.id !== id),
        results: state.results.filter((result) => result.sourceFileId !== id),
        fileErrors: omitFileError(state.fileErrors, id),
      };
    });
  },
  setActiveTool(tool) {
    set({ activeTool: tool });
  },
  async processAll(tool, options) {
    const { files, results: previousResults } = get();
    if (files.length === 0) {
      set({
        error: {
          code: 'INVALID_REQUEST',
          message: '이미지를 먼저 추가해 주세요.',
          retryable: false,
          scope: 'upload',
        },
      });
      return false;
    }

    set({ isProcessing: true, progress: 0, error: null, uploadErrors: [], fileErrors: {} });

    const nextResults: ProcessedResult[] = [];
    const nextFiles = new Map<string, UploadedFile>();
    const nextFileErrors: ImageStoreState['fileErrors'] = {};

    try {
      for (let index = 0; index < files.length; index += 1) {
        const uploaded = files[index];
        const sourceFile = uploaded.file;
        const processOptions =
          tool === 'rotate'
            ? {
                degrees: normalizeDegrees(
                  (options as { degrees: number }).degrees - uploaded.committedRotateDegrees,
                ),
              }
            : tool === 'flip'
              ? {
                  horizontal: (options as { horizontal: boolean; vertical: boolean }).horizontal !== uploaded.committedFlipHorizontal,
                  vertical: (options as { horizontal: boolean; vertical: boolean }).vertical !== uploaded.committedFlipVertical,
                }
              : options;
        try {
          const processed = await wasmClient.process(tool, sourceFile, processOptions);
          const blob = processed.blob;
          const mimeType = processed.mimeType || inferMimeType(sourceFile);
          const targetFormat =
            tool === 'convert' ? (options as { to: import('../types/image').OutputFormat }).to
            : tool === 'compress' ? (options as { format?: import('../types/image').OutputFormat }).format
            : undefined;
          const name = deriveResultName(uploaded.file, mimeType, targetFormat ? extensionFromFormat(targetFormat) : undefined);
          const url = URL.createObjectURL(blob);
          const nextFile = createProcessedFile(blob, name, mimeType);
          nextResults.push({
            id: makeId(),
            name,
            mimeType,
            size: blob.size,
            url,
            sourceFileId: uploaded.id,
            sourceSize: sourceFile.size,
          });
          nextFiles.set(uploaded.id, {
            ...uploaded,
            file: nextFile,
            previewUrl: createImageUrl(nextFile),
            committedRotateDegrees: tool === 'rotate'
              ? normalizeDegrees((options as { degrees: number }).degrees)
              : uploaded.committedRotateDegrees,
            committedFlipHorizontal: tool === 'flip'
              ? (options as { horizontal: boolean; vertical: boolean }).horizontal
              : uploaded.committedFlipHorizontal,
            committedFlipVertical: tool === 'flip'
              ? (options as { horizontal: boolean; vertical: boolean }).vertical
              : uploaded.committedFlipVertical,
          });
        } catch (error) {
          nextFileErrors[uploaded.id] = normalizeUiError(
            error,
            createImageProcessingError(sourceFile, uploaded.id),
          );
        }

        set({ progress: Math.round(((index + 1) / files.length) * 100) });
      }

      previousResults.forEach((result) => URL.revokeObjectURL(result.url));
      files.forEach((file) => {
        if (nextFiles.has(file.id) && file.previewUrl !== file.originalPreviewUrl) {
          revokeImageUrl(file.previewUrl);
        }
      });

      const failedErrors = Object.values(nextFileErrors);
      set({
        files: files.map((file) => nextFiles.get(file.id) ?? file),
        results: nextResults,
        isProcessing: false,
        progress: 100,
        error: failedErrors.length > 0 ? createProcessFailureSummary(nextResults.length, failedErrors) : null,
        fileErrors: nextFileErrors,
      });
      return failedErrors.length === 0;
    } catch (error) {
      nextResults.forEach((result) => URL.revokeObjectURL(result.url));
      nextFiles.forEach((file, id) => {
        const original = files.find((item) => item.id === id);
        if (original && file.previewUrl !== original.originalPreviewUrl) {
          revokeImageUrl(file.previewUrl);
        }
      });
      const fallbackFile = files[0]?.file ?? new File([], 'image');
      set({
        isProcessing: false,
        error: normalizeUiError(error, createImageProcessingError(fallbackFile)),
        fileErrors: {},
      });
      return false;
    }
  },
  async processSingle(id, tool, options) {
    const { files, results: previousResults } = get();
    const uploaded = files.find((f) => f.id === id);
    if (!uploaded) {
      set({
        error: {
          code: 'INVALID_REQUEST',
          message: '선택한 파일을 찾을 수 없습니다.',
          retryable: false,
          scope: 'process',
          fileId: id,
        },
      });
      return false;
    }

    set((state) => ({
      isProcessing: true,
      progress: 0,
      error: null,
      uploadErrors: [],
      fileErrors: omitFileError(state.fileErrors, id),
    }));

    try {
      const sourceFile = uploaded.file;
      const processOptions =
        tool === 'rotate'
          ? {
              degrees: normalizeDegrees(
                (options as { degrees: number }).degrees - uploaded.committedRotateDegrees,
              ),
            }
          : tool === 'flip'
            ? {
                horizontal: (options as { horizontal: boolean; vertical: boolean }).horizontal !== uploaded.committedFlipHorizontal,
                vertical: (options as { horizontal: boolean; vertical: boolean }).vertical !== uploaded.committedFlipVertical,
              }
            : options;

      const processed = await wasmClient.process(tool, sourceFile, processOptions);
      const blob = processed.blob;
      const mimeType = processed.mimeType || inferMimeType(sourceFile);
      const targetFormat =
        tool === 'convert' ? (options as { to: import('../types/image').OutputFormat }).to
        : tool === 'compress' ? (options as { format?: import('../types/image').OutputFormat }).format
        : undefined;
      const name = deriveResultName(uploaded.file, mimeType, targetFormat ? extensionFromFormat(targetFormat) : undefined);
      const url = URL.createObjectURL(blob);
      const nextFile = createProcessedFile(blob, name, mimeType);

      const newResult: ProcessedResult = {
        id: makeId(),
        name,
        mimeType,
        size: blob.size,
        url,
        sourceFileId: uploaded.id,
        sourceSize: sourceFile.size,
      };

      const updatedFile: UploadedFile = {
        ...uploaded,
        file: nextFile,
        previewUrl: createImageUrl(nextFile),
        committedRotateDegrees: tool === 'rotate'
          ? normalizeDegrees((options as { degrees: number }).degrees)
          : uploaded.committedRotateDegrees,
        committedFlipHorizontal: tool === 'flip'
          ? (options as { horizontal: boolean; vertical: boolean }).horizontal
          : uploaded.committedFlipHorizontal,
        committedFlipVertical: tool === 'flip'
          ? (options as { horizontal: boolean; vertical: boolean }).vertical
          : uploaded.committedFlipVertical,
      };

      // Revoke old result for this file if exists
      const oldResult = previousResults.find((r) => r.sourceFileId === id);
      if (oldResult) {
        URL.revokeObjectURL(oldResult.url);
      }

      // Revoke old preview if it changed
      if (uploaded.previewUrl !== uploaded.originalPreviewUrl) {
        revokeImageUrl(uploaded.previewUrl);
      }

      set((state) => ({
        files: state.files.map((f) => (f.id === id ? updatedFile : f)),
        results: [
          ...state.results.filter((r) => r.sourceFileId !== id),
          newResult,
        ],
        isProcessing: false,
        progress: 100,
        error: null,
        fileErrors: omitFileError(state.fileErrors, id),
      }));
      return true;
    } catch (error) {
      const uiError = normalizeUiError(error, createImageProcessingError(uploaded.file, id));
      set((state) => ({
        isProcessing: false,
        error: uiError,
        fileErrors: {
          ...state.fileErrors,
          [id]: uiError,
        },
      }));
      return false;
    }
  },
  resetFile(id) {
    set((state) => {
      const target = state.files.find((file) => file.id === id);
      if (!target) {
        return state;
      }

      if (target.previewUrl !== target.originalPreviewUrl) {
        revokeImageUrl(target.previewUrl);
      }

      state.results
        .filter((result) => result.sourceFileId === id)
        .forEach((result) => URL.revokeObjectURL(result.url));

      return {
        files: state.files.map((file) =>
          file.id === id
            ? {
                ...file,
                file: file.originalFile,
                previewUrl: file.originalPreviewUrl,
                committedRotateDegrees: 0,
                committedFlipHorizontal: false,
                committedFlipVertical: false,
              }
            : file,
        ),
        results: state.results.filter((result) => result.sourceFileId !== id),
        error: null,
        fileErrors: omitFileError(state.fileErrors, id),
      };
    });
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

    if (results.length === 1) {
      downloadUrl(results[0].url, results[0].name);
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
    get().files.forEach((file) => revokeUploadedFileUrls(file));
    get().results.forEach((result) => URL.revokeObjectURL(result.url));
    set({
      files: [],
      results: [],
      isProcessing: false,
      progress: 0,
      error: null,
      uploadErrors: [],
      fileErrors: {},
    });
  },
}));

export function setActiveTool(tool: ToolName) {
  useImageStore.getState().setActiveTool(tool);
}

export function processImages(tool: ToolName, options: ToolOptions) {
  return useImageStore.getState().processAll(tool, options);
}
