import type { ProcessedDocument } from '../types/document';
import { getWorkerBaseUrl } from './workerClient';

export async function postDocumentToWorker(file: File): Promise<ProcessedDocument> {
  const formData = new FormData();
  formData.set('file', file);

  const response = await fetch(`${getWorkerBaseUrl()}/api/document/convert`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let message = `Worker request failed with status ${response.status}`;
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) {
        message = payload.error;
      }
    } catch {
      // Keep the HTTP status fallback.
    }
    throw new Error(message);
  }

  return {
    blob: await response.blob(),
    mimeType: response.headers.get('content-type') ?? 'application/pdf',
  };
}
