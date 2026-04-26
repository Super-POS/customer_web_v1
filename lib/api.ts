const DEFAULT_API = "http://localhost:8000";
const DEFAULT_FILE = "http://localhost:9006";

export function getApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API).replace(/\/$/, "");
}

/** Public menu (no JWT) — same catalog as customer menu. */
export function getPublicMenuUrl(): string {
  return `${getApiBaseUrl()}/api/share/menus`;
}

/** File service base (product images) — match docker `file` port. */
export function getFileBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_FILE_BASE_URL || DEFAULT_FILE).replace(/\/$/, "");
}

export function mediaUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  const p = String(path).trim();
  if (!p) return undefined;
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  return `${getFileBaseUrl()}/${p.replace(/^\//, "")}`;
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

export function formatRiel(amount: number): string {
  return new Intl.NumberFormat("km-KH", {
    maximumFractionDigits: 0,
  }).format(amount);
}