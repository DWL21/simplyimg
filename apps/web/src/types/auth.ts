export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface Subscription {
  plan: "free" | "pro";
  status: "active" | "cancelled" | "expired";
  startedAt: string;
  expiresAt: string | null;
  remainingMonths: number;
  provider: "none" | "paypal";
}

export interface AuthMeResponse {
  user: User | null;
  subscription: Subscription | null;
  isLoggedIn: boolean;
  dailyLimit: number;
}

export interface UsageResponse {
  usage: number;
  limit: number;
}

export interface HistoryEntry {
  id: string;
  tool: string;
  file_name: string;
  input_size: number | null;
  output_size: number | null;
  created_at: string;
}

export interface HistoryResponse {
  entries: HistoryEntry[];
}
