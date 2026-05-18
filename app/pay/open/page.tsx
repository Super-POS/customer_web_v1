"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  getKhqrBankUrlCandidates,
  KHQR_BANK_OPTIONS,
  type KhqrBankId,
  type KhqrBankLinkInput,
} from "@/lib/khqr-bank-links";
import { tryOpenDeepLinks } from "@/lib/khqr-deeplink";

function intentFromParams(searchParams: URLSearchParams): KhqrBankLinkInput | null {
  const qr = searchParams.get("qr")?.trim();
  if (!qr) return null;
  return {
    qr,
    deeplink: searchParams.get("deeplink"),
    deeplink_full: searchParams.get("deeplink_full"),
  };
}

function PayOpenInner() {
  const searchParams = useSearchParams();
  const bankParam = searchParams.get("bank");
  const bankId = (KHQR_BANK_OPTIONS.some((b) => b.id === bankParam)
    ? bankParam
    : "aba") as KhqrBankId;

  const intent = useMemo(() => intentFromParams(searchParams), [searchParams]);
  const [tried, setTried] = useState(false);

  const urls = useMemo(
    () => (intent ? getKhqrBankUrlCandidates(bankId, intent) : []),
    [bankId, intent],
  );

  const bankLabel = KHQR_BANK_OPTIONS.find((b) => b.id === bankId)?.label ?? "Bank";

  useEffect(() => {
    if (!intent || tried || urls.length === 0) return;
    setTried(true);
    const timer = window.setTimeout(() => tryOpenDeepLinks(urls), 400);
    return () => window.clearTimeout(timer);
  }, [intent, tried, urls]);

  const onOpen = useCallback(() => {
    if (urls.length > 0) tryOpenDeepLinks(urls);
  }, [urls]);

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--surface)] px-6 py-10 text-center">
      <h1 className="text-xl font-bold text-[var(--text)]">Opening {bankLabel}…</h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-[var(--text-muted)]">
        Opened from Telegram. If {bankLabel} did not launch, tap below. You can also return to
        Telegram and scan the QR with {bankLabel}&apos;s KHQR scanner.
      </p>
      {!intent ? (
        <p className="mt-6 text-sm text-red-600">
          Missing payment data. Go back to Telegram, open the payment screen again, and tap your
          bank.
        </p>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          className="brand-primary-button mt-8 rounded-full px-8 py-3 text-sm font-bold"
        >
          Open {bankLabel}
        </button>
      )}
    </main>
  );
}

export default function PayOpenPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[100dvh] items-center justify-center text-sm text-[var(--text-muted)]">
          Loading…
        </main>
      }
    >
      <PayOpenInner />
    </Suspense>
  );
}
