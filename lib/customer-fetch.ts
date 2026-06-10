import { apiErrorMessage, apiUrl } from "@/lib/api";
import { CUSTOMER_ACCESS_DENIED_MESSAGE } from "@/lib/auth-token";

const RETRY_STATUSES = new Set([408, 429, 502, 503, 504]);
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 10_000; // 10s × attempt → 10s + 20s + 30s ≈ 1 min total

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchJson<T>(
  path: string,
  token: string | null,
  init?: RequestInit,
): Promise<T> {
  if (!token) {
    throw new Error("Sign in required.");
  }
  const headers = new Headers(init?.headers);
  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const method = init?.method ?? "GET";
  if (!headers.has("Content-Type") && method !== "GET" && method !== "HEAD") {
    headers.set("Content-Type", "application/json");
  }

  let attempt = 0;
  while (true) {
    const res = await fetch(apiUrl(path), { ...init, headers });
    const body: unknown = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 403) {
        throw new Error(CUSTOMER_ACCESS_DENIED_MESSAGE);
      }
      if (RETRY_STATUSES.has(res.status) && attempt < MAX_RETRIES) {
        attempt++;
        await delay(BASE_DELAY_MS * attempt);
        continue;
      }
      throw new Error(apiErrorMessage(body, "Request failed"));
    }

    return body as T;
  }
}
