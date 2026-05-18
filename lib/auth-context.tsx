"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiErrorMessage, apiUrl } from "@/lib/api";

const STORAGE_KEY = "pos_customer_token";

type TelegramInset = {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
};

type CloudStorage = {
  setItem?: (key: string, value: string, callback?: (err: Error | null) => void) => void;
  getItem?: (key: string, callback: (err: Error | null, value?: string) => void) => void;
  removeItem?: (key: string, callback?: (err: Error | null) => void) => void;
};

type TelegramThemeParams = {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
};

type TelegramWebApp = {
  initData?: string;
  version?: string;
  ready?: () => void;
  expand?: () => void;
  safeAreaInset?: TelegramInset;
  contentSafeAreaInset?: TelegramInset;
  themeParams?: TelegramThemeParams;
  CloudStorage?: CloudStorage;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

function applyTelegramInsetCss(root: HTMLElement, prefix: string, inset?: TelegramInset) {
  if (!inset) return;
  root.style.setProperty(`${prefix}-top`, `${inset.top ?? 0}px`);
  root.style.setProperty(`${prefix}-right`, `${inset.right ?? 0}px`);
  root.style.setProperty(`${prefix}-bottom`, `${inset.bottom ?? 0}px`);
  root.style.setProperty(`${prefix}-left`, `${inset.left ?? 0}px`);
}

function normalizeTelegramHex(raw?: string): string | undefined {
  if (!raw || typeof raw !== "string") return undefined;
  const s = raw.trim();
  if (s.startsWith("#")) return s;
  if (/^[0-9a-fA-F]{6}$/.test(s)) return `#${s}`;
  return undefined;
}

function applyTelegramThemeCss(root: HTMLElement, tp?: TelegramThemeParams) {
  if (!tp) return;
  const set = (cssVar: string, key: keyof TelegramThemeParams) => {
    const hex = normalizeTelegramHex(tp[key]);
    if (hex) root.style.setProperty(cssVar, hex);
  };
  set("--tg-app-bg", "bg_color");
  set("--tg-app-text", "text_color");
  set("--tg-app-hint", "hint_color");
  set("--tg-app-link", "link_color");
  set("--tg-app-button", "button_color");
  set("--tg-app-button-text", "button_text_color");
  set("--tg-app-secondary-bg", "secondary_bg_color");
}

function isTelegramCloudStorageSupported(): boolean {
  const version = window.Telegram?.WebApp?.version;
  if (!version) return false;
  const [major, minor = 0] = version.split(".").map(Number);
  return major > 6 || (major === 6 && minor >= 9);
}

function mirrorTokenToTelegramCloud(token: string) {
  if (!isTelegramCloudStorageSupported()) return;
  try {
    window.Telegram?.WebApp?.CloudStorage?.setItem?.(STORAGE_KEY, token, () => {});
  } catch {
    /* ignore */
  }
}

function clearTelegramCloudToken() {
  if (!isTelegramCloudStorageSupported()) return;
  try {
    const cs = window.Telegram?.WebApp?.CloudStorage;
    if (cs?.removeItem) {
      cs.removeItem(STORAGE_KEY, () => {});
    } else if (cs?.setItem) {
      cs.setItem(STORAGE_KEY, "", () => {});
    }
  } catch {
    /* ignore */
  }
}

function readCloudSession(maxWaitMs: number): Promise<string | null> {
  return new Promise((resolve) => {
    if (!isTelegramCloudStorageSupported()) {
      resolve(null);
      return;
    }
    const cs = window.Telegram?.WebApp?.CloudStorage;
    if (!cs?.getItem) {
      resolve(null);
      return;
    }
    let settled = false;
    const done = (value: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => done(null), maxWaitMs);
    try {
      cs.getItem(STORAGE_KEY, (err, value) => {
        if (err || typeof value !== "string" || !value.trim()) {
          done(null);
          return;
        }
        done(value.trim());
      });
    } catch {
      done(null);
    }
  });
}

/** Telegram sometimes fills `initData` shortly after the script loads. */
function awaitInitData(maxMs: number, intervalMs: number): Promise<string> {
  const deadline = Date.now() + maxMs;
  return new Promise((resolve) => {
    const tick = () => {
      const id = window.Telegram?.WebApp?.initData?.trim() ?? "";
      if (id || Date.now() >= deadline) {
        resolve(id);
        return;
      }
      window.setTimeout(tick, intervalMs);
    };
    tick();
  });
}

type AuthState = {
  token: string | null;
  ready: boolean;
  isTelegramWebApp: boolean;
  authError: string | null;
  setToken: (t: string) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [isTelegramWebApp, setIsTelegramWebApp] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;

    void (async () => {
      const initData = await awaitInitData(4500, 60);
      if (cancelled) return;

      const webApp = window.Telegram?.WebApp;
      const stored = localStorage.getItem(STORAGE_KEY);

      if (initData) {
        setIsTelegramWebApp(true);
        webApp?.ready?.();
        webApp?.expand?.();
        const root = document.documentElement;
        root.dataset.telegramWebapp = "1";
        applyTelegramInsetCss(root, "--tg-safe-area-inset", webApp?.safeAreaInset);
        applyTelegramInsetCss(root, "--tg-content-safe-area-inset", webApp?.contentSafeAreaInset);
        applyTelegramThemeCss(root, webApp?.themeParams);
      }

      if (!initData) {
        if (stored) setTokenState(stored);
        setReady(true);
        return;
      }

      const hadLocal = Boolean(stored);
      if (stored) {
        setTokenState(stored);
        setReady(true);
      }

      let hadCloud = false;
      if (!stored) {
        const cloud = await readCloudSession(1600);
        if (cancelled) return;
        if (cloud) {
          hadCloud = true;
          localStorage.setItem(STORAGE_KEY, cloud);
          setTokenState(cloud);
          setReady(true);
        }
      }

      const hadPreSession = hadLocal || hadCloud;

      try {
        const res = await fetch(apiUrl("/account/auth/telegram-webapp"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData, platform: "TelegramMiniApp" }),
        });
        const body: unknown = await res.json().catch(() => ({}));
        if (!res.ok) {
          // 4xx = API explicitly rejected this initData (wrong bot token, expired
          // auth_date, malformed payload). Inside the Mini App, Telegram's signed
          // initData is the source of truth — any cached token is for the wrong
          // session, so drop it instead of letting the next API call 401 silently.
          if (res.status >= 400 && res.status < 500) {
            const reason = apiErrorMessage(body, "Telegram sign in failed");
            const err = new Error(reason) as Error & { status?: number };
            err.status = res.status;
            throw err;
          }
          throw new Error(apiErrorMessage(body, "Telegram sign in failed"));
        }
        const nextToken = (body as { token?: unknown }).token;
        if (typeof nextToken !== "string" || !nextToken) {
          throw new Error("Telegram sign in did not return a token.");
        }
        if (cancelled) return;
        localStorage.setItem(STORAGE_KEY, nextToken);
        mirrorTokenToTelegramCloud(nextToken);
        setTokenState(nextToken);
        setAuthError(null);
      } catch (e) {
        if (cancelled) return;
        const status = (e as { status?: number } | undefined)?.status;
        const isClientRejected = typeof status === "number" && status >= 400 && status < 500;
        if (isClientRejected) {
          // API explicitly said "this Telegram session is invalid" — wipe any
          // stale local/cloud JWT so the UI doesn't pretend the user is signed
          // in. They'll see the `authError` banner in `<SignInGate />` instead.
          localStorage.removeItem(STORAGE_KEY);
          clearTelegramCloudToken();
          setTokenState(null);
          setAuthError(e instanceof Error ? e.message : "Telegram sign in failed");
        } else if (!hadPreSession) {
          // Transient network / 5xx with no prior session — fall through to the
          // existing "Telegram session unavailable" UI.
          setAuthError(e instanceof Error ? e.message : "Telegram sign in failed");
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const setToken = useCallback((t: string) => {
    localStorage.setItem(STORAGE_KEY, t);
    mirrorTokenToTelegramCloud(t);
    setTokenState(t);
    setAuthError(null);
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    clearTelegramCloudToken();
    setTokenState(null);
  }, []);

  const value = useMemo(
    () => ({ token, ready, isTelegramWebApp, authError, setToken, signOut }),
    [token, ready, isTelegramWebApp, authError, setToken, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
