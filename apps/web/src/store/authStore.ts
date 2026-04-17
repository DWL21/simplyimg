import { create } from "zustand";
import type { User, Subscription } from "../types/auth";
import { getAuthMe, getUsage, getLoginUrl, logout as authLogout } from "../lib/authClient";

const ANON_USAGE_KEY_PREFIX = "simplyimg:usage:";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getAnonUsage(): number {
  try {
    const raw = localStorage.getItem(`${ANON_USAGE_KEY_PREFIX}${todayKey()}`);
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

function incrementAnonUsage(): number {
  const next = getAnonUsage() + 1;
  try {
    localStorage.setItem(`${ANON_USAGE_KEY_PREFIX}${todayKey()}`, String(next));
    // Clean up old keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(ANON_USAGE_KEY_PREFIX) && key !== `${ANON_USAGE_KEY_PREFIX}${todayKey()}`) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore storage errors
  }
  return next;
}

const ANON_DAILY_LIMIT = 10;

interface AuthState {
  user: User | null;
  subscription: Subscription | null;
  isLoggedIn: boolean;
  dailyUsage: number;
  dailyLimit: number;
  isLoading: boolean;

  initialize: () => Promise<void>;
  login: () => void;
  logout: () => Promise<void>;
  refreshUsage: () => Promise<void>;
  incrementUsage: () => number;
  canProcess: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  subscription: null,
  isLoggedIn: false,
  dailyUsage: 0,
  dailyLimit: ANON_DAILY_LIMIT,
  isLoading: true,

  initialize: async () => {
    try {
      const me = await getAuthMe();
      let usage: number;
      if (me.isLoggedIn) {
        const usageRes = await getUsage();
        usage = usageRes.usage;
      } else {
        usage = getAnonUsage();
      }
      set({
        user: me.user,
        subscription: me.subscription,
        isLoggedIn: me.isLoggedIn,
        dailyLimit: me.dailyLimit,
        dailyUsage: usage,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false, dailyUsage: getAnonUsage() });
    }
  },

  login: () => {
    window.location.href = getLoginUrl();
  },

  logout: async () => {
    try {
      await authLogout();
    } finally {
      set({
        user: null,
        subscription: null,
        isLoggedIn: false,
        dailyUsage: 0,
        dailyLimit: ANON_DAILY_LIMIT,
      });
    }
  },

  refreshUsage: async () => {
    const { isLoggedIn } = get();
    if (isLoggedIn) {
      try {
        const res = await getUsage();
        set({ dailyUsage: res.usage, dailyLimit: res.limit });
      } catch {
        // Keep current values
      }
    } else {
      set({ dailyUsage: getAnonUsage() });
    }
  },

  incrementUsage: () => {
    const { isLoggedIn } = get();
    if (isLoggedIn) {
      set((s) => ({ dailyUsage: s.dailyUsage + 1 }));
      return get().dailyUsage;
    }
    return incrementAnonUsage();
  },

  canProcess: () => {
    const { isLoggedIn, subscription, dailyUsage, dailyLimit } = get();
    if (isLoggedIn && subscription?.plan === "pro" && subscription.status === "active") {
      return true;
    }
    return dailyUsage < dailyLimit;
  },
}));
