const DEFAULT_IMAGE_UPLOAD_LIMIT_BYTES = 30 * 1024 * 1024;
const DEFAULT_DOCUMENT_UPLOAD_LIMIT_BYTES = 50 * 1024 * 1024;

function parseEnvLimit(rawValue: string | undefined, fallback: number) {
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getImageUploadLimitBytes() {
  return parseEnvLimit(import.meta.env.VITE_MAX_UPLOAD_BYTES, DEFAULT_IMAGE_UPLOAD_LIMIT_BYTES);
}

export function getDocumentUploadLimitBytes() {
  return parseEnvLimit(import.meta.env.VITE_MAX_DOCUMENT_UPLOAD_BYTES, DEFAULT_DOCUMENT_UPLOAD_LIMIT_BYTES);
}
