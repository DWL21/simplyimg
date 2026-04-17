import type { Context, Next } from "hono";
import type { Env } from "../lib/env";
import { getSessionUserId } from "../lib/session";
import { findUserById, getActiveSubscription } from "../lib/d1";

declare module "hono" {
  interface ContextVariableMap {
    userId: string;
  }
}

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next): Promise<Response | void> {
  const userId = await getSessionUserId(c);
  if (!userId) {
    return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
  }
  c.set("userId", userId);
  await next();
}

export async function optionalAuthMiddleware(c: Context<{ Bindings: Env }>, next: Next): Promise<void> {
  const userId = await getSessionUserId(c);
  if (userId) {
    c.set("userId", userId);
  }
  await next();
}

export async function getAuthContext(c: Context<{ Bindings: Env }>) {
  const userId = c.get("userId") as string | undefined;
  if (!userId) return { user: null, subscription: null };

  const [user, subscription] = await Promise.all([
    findUserById(c.env.DB, userId),
    getActiveSubscription(c.env.DB, userId),
  ]);

  return { user, subscription };
}
