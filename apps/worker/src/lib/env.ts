export interface Env {
  DB: D1Database;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  SESSION_SECRET: string;
  MAX_UPLOAD_BYTES: string;
  MAX_DOCUMENT_UPLOAD_BYTES: string;
  DAILY_FREE_LIMIT: string;
  DAILY_LOGGED_LIMIT: string;
  FRONTEND_URL: string;
}
