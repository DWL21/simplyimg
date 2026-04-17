import { getCookie, setCookie } from "hono/cookie";
import type { Context } from "hono";
import type { Env } from "./env";

const SESSION_COOKIE = "simplyimg_session";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

interface SessionData {
  userId: string;
  createdAt: number;
}

function uint8ArrayToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSign(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return uint8ArrayToHex(new Uint8Array(sig));
}

function encodeSession(data: SessionData): string {
  return btoa(JSON.stringify(data));
}

function decodeSession(raw: string): SessionData | null {
  try {
    return JSON.parse(atob(raw));
  } catch {
    return null;
  }
}

export async function createSession(c: Context<{ Bindings: Env }>, userId: string): Promise<void> {
  const data: SessionData = { userId, createdAt: Date.now() };
  const encoded = encodeSession(data);
  const signature = await hmacSign(encoded, c.env.SESSION_SECRET);
  const token = `${encoded}.${signature}`;

  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function getSessionUserId(c: Context<{ Bindings: Env }>): Promise<string | null> {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return null;

  const dotIndex = token.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const encoded = token.substring(0, dotIndex);
  const signature = token.substring(dotIndex + 1);

  const expected = await hmacSign(encoded, c.env.SESSION_SECRET);
  if (signature !== expected) return null;

  const data = decodeSession(encoded);
  if (!data) return null;

  const age = Date.now() - data.createdAt;
  if (age > SESSION_MAX_AGE * 1000) return null;

  return data.userId;
}

export function clearSession(c: Context<{ Bindings: Env }>): void {
  setCookie(c, SESSION_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    maxAge: 0,
    path: "/",
  });
}
