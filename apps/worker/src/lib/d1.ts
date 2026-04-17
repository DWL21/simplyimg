import type { Env } from "./env";

export interface DbUser {
  id: string;
  google_id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface DbSubscription {
  id: string;
  user_id: string;
  plan: "free" | "pro";
  status: "active" | "cancelled" | "expired";
  started_at: string;
  expires_at: string | null;
  remaining_months: number;
  cancelled_at: string | null;
  provider: "none" | "paypal";
  provider_subscription_id: string | null;
  created_at: string;
}

export interface DbHistoryEntry {
  id: string;
  user_id: string;
  tool: string;
  file_name: string;
  input_size: number | null;
  output_size: number | null;
  created_at: string;
}

export async function findUserByGoogleId(db: D1Database, googleId: string): Promise<DbUser | null> {
  return db.prepare("SELECT * FROM users WHERE google_id = ?").bind(googleId).first<DbUser>();
}

export async function findUserById(db: D1Database, id: string): Promise<DbUser | null> {
  return db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<DbUser>();
}

export async function createUser(
  db: D1Database,
  data: { id: string; google_id: string; email: string; name: string; avatar_url: string | null },
): Promise<DbUser> {
  await db
    .prepare("INSERT INTO users (id, google_id, email, name, avatar_url) VALUES (?, ?, ?, ?, ?)")
    .bind(data.id, data.google_id, data.email, data.name, data.avatar_url)
    .run();
  return (await findUserById(db, data.id))!;
}

export async function getActiveSubscription(db: D1Database, userId: string): Promise<DbSubscription | null> {
  return db
    .prepare("SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1")
    .bind(userId)
    .first<DbSubscription>();
}

export async function createFreeSubscription(db: D1Database, userId: string): Promise<void> {
  const id = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO subscriptions (id, user_id, plan, status, started_at, remaining_months, provider) VALUES (?, ?, 'free', 'active', datetime('now'), 0, 'none')",
    )
    .bind(id, userId)
    .run();
}

export async function insertHistoryEntry(
  db: D1Database,
  data: {
    id: string;
    user_id: string;
    tool: string;
    file_name: string;
    input_size: number | null;
    output_size: number | null;
  },
): Promise<void> {
  await db
    .prepare("INSERT INTO processing_history (id, user_id, tool, file_name, input_size, output_size) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(data.id, data.user_id, data.tool, data.file_name, data.input_size, data.output_size)
    .run();
}

export async function getHistory(
  db: D1Database,
  userId: string,
  limit = 50,
  offset = 0,
): Promise<DbHistoryEntry[]> {
  const { results } = await db
    .prepare("SELECT * FROM processing_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?")
    .bind(userId, limit, offset)
    .all<DbHistoryEntry>();
  return results;
}

export async function deleteHistoryEntry(db: D1Database, id: string, userId: string): Promise<boolean> {
  const result = await db.prepare("DELETE FROM processing_history WHERE id = ? AND user_id = ?").bind(id, userId).run();
  return result.meta.changes > 0;
}

export async function getTodayUsageCount(db: D1Database, userId: string): Promise<number> {
  const row = await db
    .prepare("SELECT COUNT(*) as count FROM processing_history WHERE user_id = ? AND date(created_at) = date('now')")
    .bind(userId)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

export function getDailyLimit(env: Env, isLoggedIn: boolean): number {
  const limit = isLoggedIn ? env.DAILY_LOGGED_LIMIT : env.DAILY_FREE_LIMIT;
  const parsed = Number.parseInt(limit, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : isLoggedIn ? 50 : 10;
}
