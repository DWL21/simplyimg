import { getWorkerBaseUrl } from "./workerClient";
import type {
  AuthMeResponse,
  UsageResponse,
  HistoryEntry,
  HistoryResponse,
} from "../types/auth";

function baseUrl() {
  return getWorkerBaseUrl();
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    credentials: "include",
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function getAuthMe(): Promise<AuthMeResponse> {
  return fetchJson<AuthMeResponse>("/api/auth/me");
}

export async function getUsage(): Promise<UsageResponse> {
  return fetchJson<UsageResponse>("/api/auth/usage");
}

export function getLoginUrl(): string {
  return `${baseUrl()}/api/auth/google`;
}

export async function logout(): Promise<void> {
  await fetchJson<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
}

export async function postHistory(entry: {
  tool: string;
  fileName: string;
  inputSize?: number;
  outputSize?: number;
}): Promise<void> {
  await fetchJson<{ ok: boolean }>("/api/history", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
}

export async function getHistory(
  limit = 50,
  offset = 0,
): Promise<HistoryEntry[]> {
  const res = await fetchJson<HistoryResponse>(
    `/api/history?limit=${limit}&offset=${offset}`,
  );
  return res.entries;
}

export async function deleteHistory(id: string): Promise<void> {
  await fetchJson<{ ok: boolean }>(`/api/history/${id}`, {
    method: "DELETE",
  });
}
