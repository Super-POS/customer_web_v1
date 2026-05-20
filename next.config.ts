import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";

const projectRoot = process.cwd();
loadEnvConfig(projectRoot);

/**
 * When `NEXT_PUBLIC_API_URL` is a same-origin path like `/api`, the browser calls
 * this Next server. Rewrites forward `/api/*` to the real backend (default POS API).
 * Set `API_REWRITE_TARGET` if your API is not on http://localhost:9003.
 */
function sameOriginApiPath(): boolean {
  const v = (process.env.NEXT_PUBLIC_API_URL || "").trim();
  return v === "/api" || v.startsWith("/api/");
}

/** Same-origin prefix for file-v1 (menu images). Browser cannot load loopback from ngrok/Telegram. */
function sameOriginFilePath(): boolean {
  const v = (process.env.NEXT_PUBLIC_FILE_BASE_URL || "/files").trim();
  return v === "/files" || v.startsWith("/files/");
}

function devAllowedOrigins(): string[] {
  const wildcards = [
    "*.ngrok-free.app",
    "*.ngrok.io",
    "*.trycloudflare.com",
  ];
  const extra = (process.env.NEXT_DEV_ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [...wildcards, ...extra];
}

const nextConfig: NextConfig = {
  allowedDevOrigins: devAllowedOrigins(),
  async rewrites() {
    const rules: { source: string; destination: string }[] = [];
    if (sameOriginApiPath()) {
      const target = (process.env.API_REWRITE_TARGET || "http://localhost:9003").replace(/\/$/, "");
      rules.push({ source: "/api/:path*", destination: `${target}/api/:path*` });
    }
    if (sameOriginFilePath()) {
      const fileTarget = (process.env.FILE_REWRITE_TARGET || "http://localhost:9006").replace(/\/$/, "");
      rules.push({ source: "/files/:path*", destination: `${fileTarget}/:path*` });
    }
    return rules;
  },
};

export default nextConfig;
