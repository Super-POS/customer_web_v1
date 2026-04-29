import { apiErrorMessage, apiUrl } from "@/lib/api";

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
  const res = await fetch(apiUrl(path), { ...init, headers });
  const body: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(apiErrorMessage(body, "Request failed"));
  }
  return body as T;
}
