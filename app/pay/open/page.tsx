"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  KHQR_BANK_OPTIONS,
  getNbcKhqrUrl,
  type KhqrBankId,
  type KhqrBankLinkInput,
} from "@/lib/khqr-bank-links";
import { openKhqrDeepLink } from "@/lib/khqr-deeplink";

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
  const intent = useMemo(() => intentFromParams(searchParams), [searchParams]);
  const bankParam = (searchParams.get("bank") ?? "bakong") as KhqrBankId;
  const nbc = intent ? getNbcKhqrUrl(intent) : null;

  const bankOption = KHQR_BANK_OPTIONS.find((b) => b.id === bankParam);
  const chipClass = bankOption?.chipClass ?? "bg-[#1A7F4E]";
  const initials = bankOption?.initials ?? "BK";
  const label = bankOption?.label ?? "Bakong";

  // Fire the NBC deeplink immediately — it handles all banks with QR pre-filled
  useEffect(() => {
    if (nbc) openKhqrDeepLink(nbc);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCopy = async () => {
    if (!intent) return;
    try {
      await navigator.clipboard?.writeText(intent.qr);
    } catch {
      /* ignore */
    }
  };

  if (!intent) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-(--surface) px-6 py-10 text-center">
        <h1 className="text-xl font-bold text-foreground">Payment link missing</h1>
        <p className="mt-3 max-w-sm text-sm text-(--text-muted)">
          Go back and open payment from the order or wallet screen.
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center bg-(--surface) px-6 py-8">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xs font-bold text-white ${chipClass}`}
        >
          {initials}
        </span>
        <h1 className="mt-3 text-xl font-bold text-foreground">Pay with {label}</h1>
        <p className="mt-2 text-sm text-(--text-muted)">
          Select <strong>{label}</strong> in the bank picker, or scan the QR below.
        </p>

        <div className="mt-5 flex flex-col items-center gap-3 rounded-2xl border border-(--border) bg-white p-5 shadow-sm">
          <QRCodeSVG value={intent.qr} size={232} level="M" includeMargin={false} />
        </div>

        <div className="mt-5 flex w-full flex-col gap-2">
          {nbc && (
            <button
              type="button"
              onClick={() => openKhqrDeepLink(nbc)}
              className="brand-primary-button w-full rounded-full px-4 py-3 text-sm font-bold"
            >
              Open bank picker
            </button>
          )}
          <button
            type="button"
            onClick={() => void onCopy()}
            className="w-full rounded-full border border-(--border) px-4 py-2 text-sm font-semibold text-(--text-muted) hover:border-(--primary) hover:text-foreground"
          >
            Copy KHQR
          </button>
        </div>
      </div>
    </main>
  );
}

export default function PayOpenPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center text-sm text-(--text-muted)">
          Loading…
        </main>
      }
    >
      <PayOpenInner />
    </Suspense>
  );
}
