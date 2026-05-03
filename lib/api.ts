/** Same-origin so dev (ngrok/Telegram WebView) hits Next rewrites or the bot proxy, not localhost in the browser. */
const DEFAULT_API = "/api";
const DEFAULT_FILE = "/files";

function envApiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API).replace(/\/$/, "");
}

function isLoopbackHttpUrl(url: string): boolean {
  try {
    if (!url.startsWith("http://") && !url.startsWith("https://")) return false;
    const h = new URL(url).hostname.toLowerCase();
    return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
  } catch {
    return false;
  }
}

/** Base URL without forcing `/api` — see {@link apiUrl}. */
export function getApiBaseUrl(): string {
  let base = envApiBase();
  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase();
    const pageIsLoopback = host === "localhost" || host === "127.0.0.1";
    if (!pageIsLoopback && isLoopbackHttpUrl(base)) {
      base = "/api";
    }
  }
  return base;
}

/**
 * Builds `/api/...` URLs whether env is `http://host` or `http://host/api`.
 */
export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  let origin = getApiBaseUrl().replace(/\/$/, "");
  if (origin.endsWith("/api")) {
    origin = origin.slice(0, -4);
  }
  return `${origin}/api${normalized}`;
}

/** Public menu catalog (no JWT). Backend: GET `/api/share/menus`. */
export function getPublicMenuUrl(): string {
  return apiUrl("/share/menus");
}

/** Public KHR-per-USD rate (no JWT). Backend: GET `/api/share/exchange-rate`. */
export function getPublicExchangeRateUrl(): string {
  return apiUrl("/share/exchange-rate");
}

/** Matches API `FALLBACK_KHR_PER_USD` / `ExchangeSettingService`. */
export const FALLBACK_KHR_PER_USD = 4100;

/** Same rounding as API `khrToUsdDisplay` and web-v1 `ExchangeRateSettingService.khrToUsd`. */
export function khrToUsdDisplay(khr: number | null | undefined, khrPerUsd: number): number {
  const k = Number(khr ?? 0);
  const r = Number(khrPerUsd);
  if (!Number.isFinite(k) || !Number.isFinite(r) || r <= 0) {
    return 0;
  }
  return Math.round((k / r) * 10000) / 10000;
}

/** File service base (menu images). Use same-origin `/files` so Telegram/ngrok can reach file-v1 via Next rewrites. */
export function getFileBaseUrl(): string {
  let base = (process.env.NEXT_PUBLIC_FILE_BASE_URL || DEFAULT_FILE).replace(/\/$/, "");
  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase();
    const pageIsLoopback = host === "localhost" || host === "127.0.0.1";
    if (!pageIsLoopback && isLoopbackHttpUrl(base)) {
      base = "/files";
    }
  }
  return base;
}

/** If API stored a full loopback file URL, map it to the same-origin file prefix. */
function relativeFilePathFromStored(path: string): string | null {
  try {
    if (!path.startsWith("http://") && !path.startsWith("https://")) return null;
    if (!isLoopbackHttpUrl(path)) return null;
    const pathname = new URL(path).pathname.replace(/^\//, "");
    if (pathname.startsWith("api/file/")) return pathname;
    return null;
  } catch {
    return null;
  }
}

export function mediaUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  let p = String(path).trim();
  if (!p) return undefined;
  const fromFull = relativeFilePathFromStored(p);
  if (fromFull) p = fromFull;
  else if (p.startsWith("http://") || p.startsWith("https://")) return p;
  const base = getFileBaseUrl().replace(/\/$/, "");
  return `${base}/${p.replace(/^\//, "")}`;
}

export function apiErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const b = body as { message?: unknown; error?: string };
  if (Array.isArray(b.message)) {
    const first = b.message[0];
    if (first && typeof first === "object" && "constraints" in first) {
      const c = (first as { constraints?: Record<string, string> }).constraints;
      if (c) {
        const v = Object.values(c)[0];
        if (v) return v;
      }
    }
    if (typeof b.message[0] === "string") return b.message[0];
  }
  if (typeof b.message === "string") return b.message;
  if (b.error) return b.error;
  return fallback;
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Format stored KHR amounts as USD using the active POS rate. */
export function formatUsdFromKhr(khr: number | null | undefined, khrPerUsd: number): string {
  return formatUsd(khrToUsdDisplay(khr, khrPerUsd));
}
