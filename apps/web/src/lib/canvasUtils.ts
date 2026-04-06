export function createImageUrl(file: File): string {
  return URL.createObjectURL(file);
}

export function revokeImageUrl(url: string): void {
  URL.revokeObjectURL(url);
}

export async function readArrayBuffer(file: File): Promise<ArrayBuffer> {
  return file.arrayBuffer();
}

export function bufferToBlob(buffer: ArrayBuffer, mimeType: string): Blob {
  return new Blob([buffer], { type: mimeType });
}
