import type { OutputFormat } from '../types/image';

export const acceptedImageInput = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.svg',
  '.heic',
  '.heif',
  '.gif',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'image/heic',
  'image/heif',
  'image/gif',
].join(',');

export function bytesToHuman(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }

  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function formatLabel(format: string): string {
  return format.toUpperCase();
}

export function mimeFromFormat(format: OutputFormat): string {
  switch (format) {
    case 'jpeg':
    case 'jpg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';
  }
}

export function extensionFromFormat(format: OutputFormat): string {
  switch (format) {
    case 'jpeg': return 'jpeg';
    case 'jpg': return 'jpg';
    case 'png': return 'png';
    case 'webp': return 'webp';
    case 'svg': return 'svg';
  }
}

export function extensionFromMime(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/svg+xml':
      return 'svg';
    default:
      return 'bin';
  }
}

export function inferMimeType(file: File): string {
  if (file.type) {
    return file.type;
  }

  const extension = file.name.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';
    case 'heic':
      return 'image/heic';
    case 'heif':
      return 'image/heif';
    case 'gif':
      return 'image/gif';
    default:
      return 'application/octet-stream';
  }
}

export function isSupportedImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) {
    return true;
  }

  const extension = file.name.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'webp', 'svg', 'heic', 'heif', 'gif'].includes(extension ?? '');
}

export function preferredRasterMimeType(file: File): 'image/jpeg' | 'image/png' | 'image/webp' {
  const mimeType = inferMimeType(file);
  if (mimeType === 'image/jpeg' || mimeType === 'image/png' || mimeType === 'image/webp') {
    return mimeType;
  }

  return 'image/png';
}
