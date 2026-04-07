import { bytesToHuman } from './formatUtils';
import { getDocumentUploadLimitBytes, getImageUploadLimitBytes } from './uploadLimits';

export type UiErrorCode =
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_FILE'
  | 'EMPTY_FILE'
  | 'INVALID_REQUEST'
  | 'NETWORK_ERROR'
  | 'PROCESSING_FAILED'
  | 'UPLOAD_REJECTED'
  | 'PARTIAL_PROCESS_FAILED'
  | 'RENDER_FAILED';

export interface UiError {
  code: UiErrorCode | string;
  message: string;
  retryable: boolean;
  scope: 'upload' | 'process' | 'render';
  fileName?: string;
  fileId?: string;
  limitBytes?: number;
  actualBytes?: number;
  status?: number;
}

export class UiErrorException extends Error {
  constructor(public readonly uiError: UiError) {
    super(uiError.message);
    this.name = 'UiErrorException';
  }
}

function createUiError(error: UiError): UiError {
  return error;
}

export function getErrorMessage(error: UiError | null) {
  return error?.message ?? null;
}

export function createImageFileTooLargeError(file: File): UiError {
  const limitBytes = getImageUploadLimitBytes();
  return createUiError({
    code: 'FILE_TOO_LARGE',
    message: `${file.name}: 이미지 업로드 제한은 ${bytesToHuman(limitBytes)}입니다. 선택한 파일은 ${bytesToHuman(file.size)}입니다.`,
    retryable: false,
    scope: 'upload',
    fileName: file.name,
    actualBytes: file.size,
    limitBytes,
  });
}

export function createDocumentFileTooLargeError(file: File): UiError {
  const limitBytes = getDocumentUploadLimitBytes();
  return createUiError({
    code: 'FILE_TOO_LARGE',
    message: `${file.name}: 문서 업로드 제한은 ${bytesToHuman(limitBytes)}입니다. 선택한 파일은 ${bytesToHuman(file.size)}입니다.`,
    retryable: false,
    scope: 'upload',
    fileName: file.name,
    actualBytes: file.size,
    limitBytes,
  });
}

export function createUnsupportedImageFileError(file: File): UiError {
  return createUiError({
    code: 'UNSUPPORTED_FILE',
    message: `${file.name}: 지원하지 않는 이미지 형식입니다.`,
    retryable: false,
    scope: 'upload',
    fileName: file.name,
  });
}

export function createUnsupportedDocumentFileError(file: File): UiError {
  return createUiError({
    code: 'UNSUPPORTED_FILE',
    message: `${file.name}: Markdown 파일만 추가할 수 있습니다.`,
    retryable: false,
    scope: 'upload',
    fileName: file.name,
  });
}

export function createEmptyFileError(file: File): UiError {
  return createUiError({
    code: 'EMPTY_FILE',
    message: `${file.name}: 비어 있는 파일은 업로드할 수 없습니다.`,
    retryable: false,
    scope: 'upload',
    fileName: file.name,
  });
}

export function createUploadRejectionSummary(errors: UiError[]): UiError {
  const count = errors.length;
  return createUiError({
    code: 'UPLOAD_REJECTED',
    message:
      count === 1
        ? '선택한 파일을 추가할 수 없습니다.'
        : `${count}개 파일을 추가할 수 없습니다. 아래 사유를 확인하세요.`,
    retryable: true,
    scope: 'upload',
  });
}

export function createImageProcessingError(file: File, fileId?: string, message?: string): UiError {
  return createUiError({
    code: 'PROCESSING_FAILED',
    message: message ?? `${file.name}: 이미지 처리에 실패했습니다.`,
    retryable: true,
    scope: 'process',
    fileName: file.name,
    fileId,
  });
}

export function createDocumentRenderingError(file: File, message?: string): UiError {
  return createUiError({
    code: 'RENDER_FAILED',
    message: message ?? `${file.name}: 문서 렌더링에 실패했습니다.`,
    retryable: true,
    scope: 'render',
    fileName: file.name,
  });
}

export function createNetworkError(): UiError {
  return createUiError({
    code: 'NETWORK_ERROR',
    message: '네트워크 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.',
    retryable: true,
    scope: 'process',
  });
}

export function createProcessFailureSummary(successCount: number, failedErrors: UiError[]): UiError {
  const failedCount = failedErrors.length;
  if (failedCount === 1 && successCount === 0) {
    return failedErrors[0];
  }

  return createUiError({
    code: 'PARTIAL_PROCESS_FAILED',
    message:
      successCount === 0
        ? `${failedCount}개 파일 처리에 실패했습니다. 아래 사유를 확인하세요.`
        : `${successCount}개 파일은 처리했고 ${failedCount}개 파일은 처리하지 못했습니다.`,
    retryable: true,
    scope: 'process',
  });
}

export function createImageWorkerError(
  payload: { code?: string; error?: string },
  status: number,
  file: File,
): UiError {
  if (payload.code === 'FILE_TOO_LARGE') {
    return createUiError({
      ...createImageFileTooLargeError(file),
      status,
    });
  }

  if (payload.code === 'EMPTY_FILE') {
    return createUiError({
      ...createEmptyFileError(file),
      status,
    });
  }

  if (payload.code === 'INVALID_REQUEST') {
    return createUiError({
      code: 'INVALID_REQUEST',
      message: '요청 형식이 올바르지 않습니다. 파일을 다시 선택해 주세요.',
      retryable: true,
      scope: 'process',
      fileName: file.name,
      status,
    });
  }

  return createUiError({
    ...createImageProcessingError(file, undefined, payload.error ?? `요청 처리에 실패했습니다. (${status})`),
    status,
  });
}

export function normalizeUiError(error: unknown, fallback: UiError): UiError {
  if (error instanceof UiErrorException) {
    return error.uiError;
  }

  if (error instanceof Error) {
    return createUiError({
      ...fallback,
      message: error.message || fallback.message,
    });
  }

  return fallback;
}
