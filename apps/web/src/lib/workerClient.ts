import type { ProcessedImage, ToolName, ToolOptions } from '../types/image';
import { inferMimeType } from './formatUtils';
import { createImageWorkerError, createNetworkError, UiErrorException } from './uiErrors';

const defaultBaseUrl = 'http://localhost:8787';

export function getWorkerBaseUrl() {
  const configured = import.meta.env.VITE_WORKER_URL?.trim();
  return configured && configured.length > 0 ? configured : defaultBaseUrl;
}

// The Cloudflare worker doesn't recognise 'jpg' as a format name; normalise it to 'jpeg'.
function normalizeOptions(options: ToolOptions): ToolOptions {
  const opts = options as unknown as Record<string, unknown>;
  if (opts['to'] === 'jpg') return { ...opts, to: 'jpeg' } as unknown as ToolOptions;
  if (opts['format'] === 'jpg') return { ...opts, format: 'jpeg' } as unknown as ToolOptions;
  return options;
}

export async function postToWorker(
  tool: ToolName,
  file: File,
  options: ToolOptions,
): Promise<ProcessedImage> {
  const formData = new FormData();
  formData.set('file', file);
  formData.set('options', JSON.stringify(normalizeOptions(options)));

  let response: Response;
  try {
    response = await fetch(`${getWorkerBaseUrl()}/api/${tool}`, {
      method: 'POST',
      body: formData,
    });
  } catch {
    throw new UiErrorException(createNetworkError());
  }

  if (!response.ok) {
    let payload: { error?: string; code?: string } = {};
    try {
      payload = (await response.json()) as { error?: string; code?: string };
    } catch {
      // Keep the HTTP status fallback.
    }

    throw new UiErrorException(
      createImageWorkerError(
        { code: payload.code, error: payload.error },
        response.status,
        file,
      ),
    );
  }

  return {
    blob: await response.blob(),
    mimeType: response.headers.get('content-type') ?? inferMimeType(file),
  };
}
