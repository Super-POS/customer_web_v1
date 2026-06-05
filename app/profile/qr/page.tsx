"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { fetchJson } from "@/lib/customer-fetch";

type QrResponse = {
  data: { qr: string };
};

export default function ProfileQrPage() {
  const router = useRouter();
  const { token, ready } = useAuth();
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchJson<QrResponse>("/customer/profile/qr", token);
      setQr(res.data.qr);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load QR code.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--bg)]">
      <button
        type="button"
        onClick={() => router.back()}
        className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-[var(--text-muted)] transition hover:bg-[color-mix(in_srgb,var(--border)_50%,transparent)] hover:text-[var(--text)]"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back
      </button>

      {!ready || (ready && !token) ? (
        <p className="text-sm text-[var(--text-muted)]">Sign in required.</p>
      ) : loading ? (
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[color-mix(in_srgb,var(--primary)_20%,white)] border-t-[var(--primary)]" />
          <p className="text-sm text-[var(--text-muted)]">Loading QR…</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-4 px-6 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="brand-primary-button rounded-full px-6 py-2.5 text-sm font-bold"
          >
            Retry
          </button>
        </div>
      ) : qr ? (
        <div className="flex flex-col items-center gap-6 px-6">
          <div className="rounded-3xl bg-white p-4 shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qr}
              alt="My profile QR code"
              className="h-64 w-64 object-contain sm:h-80 sm:w-80"
              draggable={false}
            />
          </div>
          <p className="text-xs text-[var(--text-muted)]">Scan to view your profile</p>
        </div>
      ) : null}
    </div>
  );
}
