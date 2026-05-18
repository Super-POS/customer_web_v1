"use client";

import {
  canShowKhqrBankPicker,
  getKhqrBankUrlCandidates,
  KHQR_BANK_OPTIONS,
  type KhqrBankId,
  type KhqrBankLinkInput,
} from "@/lib/khqr-bank-links";
import { openKhqrBankApp } from "@/lib/khqr-deeplink";
import { useAuth } from "@/lib/auth-context";
import { notifyError } from "@/lib/notify";

type BakongBankPickerProps = {
  intent: KhqrBankLinkInput;
  className?: string;
};

/**
 * Grid of bank choices — each opens that bank's app with the KHQR payload when possible.
 * "Other bank" uses NBC's hosted Bakong redirect (ABA, ACLEDA, Wing, etc.).
 */
export function BakongBankPicker({ intent, className }: BakongBankPickerProps) {
  const { isTelegramWebApp } = useAuth();

  if (!canShowKhqrBankPicker()) return null;

  const onPick = (bankId: KhqrBankId) => {
    const urls = getKhqrBankUrlCandidates(bankId, intent);
    if (urls.length === 0) {
      notifyError("Could not open that bank app. Please scan the QR code instead.");
      return;
    }
    openKhqrBankApp(bankId, intent, { inTelegram: isTelegramWebApp });
  };

  return (
    <div className={className}>
      <p className="mb-2 text-center text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        Pay with your bank app
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {KHQR_BANK_OPTIONS.map((bank) => (
          <button
            key={bank.id}
            type="button"
            onClick={() => onPick(bank.id)}
            className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-left transition hover:border-[var(--primary)] hover:bg-white"
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white ${bank.chipClass}`}
            >
              {bank.initials}
            </span>
            <span className="text-sm font-semibold text-[var(--text)]">{bank.label}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-center text-[11px] leading-relaxed text-[var(--text-muted)]">
        {isTelegramWebApp
          ? "ABA / ACLEDA / Wing open in your browser, then launch the bank app. Or scan the QR in Telegram."
          : "If your app does not open, scan the QR above with that bank's KHQR scanner."}
      </p>
    </div>
  );
}
