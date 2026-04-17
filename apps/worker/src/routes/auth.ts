import type { Hono } from "hono";
import type { Env } from "../lib/env";
import { createSession, clearSession } from "../lib/session";
import { authMiddleware, getAuthContext } from "../middleware/auth";
import {
  findUserByGoogleId,
  createUser,
  createFreeSubscription,
  getTodayUsageCount,
  getDailyLimit,
  getHistory,
  deleteHistoryEntry,
  insertHistoryEntry,
} from "../lib/d1";
import { errorResponse } from "../lib/errors";

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  token_type: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  name: string;
  picture: string;
}

async function exchangeCode(env: Env, code: string): Promise<GoogleTokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${new URL(env.FRONTEND_URL ?? "https://simplyimg.com").origin}/api/auth/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error("Token exchange failed");
  return res.json();
}

async function fetchGoogleUser(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch user info");
  return res.json();
}

export const registerAuthRoutes = (app: Hono<{ Bindings: Env }>): void => {
  app.get("/api/auth/google", (c) => {
    const origin = new URL(c.req.url).origin;
    const redirectUri = `${origin}/api/auth/callback`;
    const params = new URLSearchParams({
      client_id: c.env.GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "consent",
    });
    return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  });

  app.get("/api/auth/callback", async (c) => {
    const code = c.req.query("code");
    if (!code) return c.redirect("/");

    try {
      const tokens = await exchangeCode(c.env, code);
      const googleUser = await fetchGoogleUser(tokens.access_token);

      let user = await findUserByGoogleId(c.env.DB, googleUser.sub);
      if (!user) {
        const id = crypto.randomUUID();
        user = await createUser(c.env.DB, {
          id,
          google_id: googleUser.sub,
          email: googleUser.email,
          name: googleUser.name,
          avatar_url: googleUser.picture,
        });
        await createFreeSubscription(c.env.DB, id);
      }

      await createSession(c, user.id);
      const frontendUrl = c.env.FRONTEND_URL ?? "https://simplyimg.com";
      return c.redirect(frontendUrl);
    } catch (err) {
      console.error("OAuth callback error:", err);
      return c.redirect("/?auth=error");
    }
  });

  app.post("/api/auth/logout", (c) => {
    clearSession(c);
    return c.json({ ok: true });
  });

  app.get("/api/auth/me", async (c) => {
    try {
      const { user, subscription } = await getAuthContext(c);
      const isLoggedIn = !!user;
      return c.json({
        user: user
          ? {
              id: user.id,
              name: user.name,
              email: user.email,
              avatarUrl: user.avatar_url,
            }
          : null,
        subscription: subscription
          ? {
              plan: subscription.plan,
              status: subscription.status,
              startedAt: subscription.started_at,
              expiresAt: subscription.expires_at,
              remainingMonths: subscription.remaining_months,
              provider: subscription.provider,
            }
          : null,
        isLoggedIn,
        dailyLimit: getDailyLimit(c.env, isLoggedIn),
      });
    } catch (err) {
      return errorResponse(err);
    }
  });

  app.get("/api/auth/usage", async (c) => {
    try {
      const userId = c.get("userId") as string | undefined;
      if (!userId) {
        return c.json({ usage: 0, limit: getDailyLimit(c.env, false) });
      }
      const usage = await getTodayUsageCount(c.env.DB, userId);
      return c.json({ usage, limit: getDailyLimit(c.env, true) });
    } catch (err) {
      return errorResponse(err);
    }
  });

  app.post("/api/history", authMiddleware, async (c) => {
    try {
      const userId = c.get("userId") as string;
      const body = await c.req.json<{ tool: string; fileName: string; inputSize?: number; outputSize?: number }>();
      await insertHistoryEntry(c.env.DB, {
        id: crypto.randomUUID(),
        user_id: userId,
        tool: body.tool,
        file_name: body.fileName,
        input_size: body.inputSize ?? null,
        output_size: body.outputSize ?? null,
      });
      return c.json({ ok: true }, 201);
    } catch (err) {
      return errorResponse(err);
    }
  });

  app.get("/api/history", authMiddleware, async (c) => {
    try {
      const userId = c.get("userId") as string;
      const limit = Math.min(Number(c.req.query("limit") ?? "50"), 100);
      const offset = Number(c.req.query("offset") ?? "0");
      const entries = await getHistory(c.env.DB, userId, limit, offset);
      return c.json({ entries });
    } catch (err) {
      return errorResponse(err);
    }
  });

  app.delete("/api/history/:id", authMiddleware, async (c) => {
    try {
      const userId = c.get("userId") as string;
      const id = c.req.param("id") ?? "";
      if (!id) return c.json({ error: "Missing id", code: "BAD_REQUEST" }, 400);
      const deleted = await deleteHistoryEntry(c.env.DB, id, userId);
      if (!deleted) return c.json({ error: "Not found", code: "NOT_FOUND" }, 404);
      return c.json({ ok: true });
    } catch (err) {
      return errorResponse(err);
    }
  });
};
