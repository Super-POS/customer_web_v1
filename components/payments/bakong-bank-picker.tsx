"use client";

import { useState } from "react";
import {
  KHQR_BANK_OPTIONS,
  getNbcKhqrUrl,
  type KhqrBankId,
  type KhqrBankLinkInput,
} from "@/lib/khqr-bank-links";
import {
  getBankStoreUrl,
  openKhqrBank,
} from "@/lib/khqr-deeplink";
import { canShowKhqrBankPicker } from "@/lib/khqr-device";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notify";

type BakongBankPickerProps = {
  intent: KhqrBankLinkInput;
  className?: string;
};

export function BakongBankPicker({ intent, className }: BakongBankPickerProps) {
  const [selectedBank, setSelectedBank] = useState<KhqrBankId>("bakong");

  if (!canShowKhqrBankPicker()) return null;

  const nbcUrl = getNbcKhqrUrl(intent);
  const selected = KHQR_BANK_OPTIONS.find((b) => b.id === selectedBank)!;
  const storeUrl = getBankStoreUrl(selectedBank);
  const scanManually = !selected.prefillsQr;

  const onPay = () => {
    const result = openKhqrBank(selectedBank, intent);
    switch (result) {
      case "opened-nbc-pay":
        notifyInfo(`Opening payment — choose ${selected.label} in the bank picker.`);
        return;
      case "no-nbc-link":
        notifyError("Payment link not available. Scan the KHQR above with your bank app.");
        return;
      default:
        notifyError("Could not open bank app. Scan the KHQR above instead.");
    }
  };

  const onCopyQr = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(intent.qr);
        notifySuccess("KHQR copied. Paste it in your bank app.");
      } else {
        throw new Error("Clipboard API unavailable");
      }
    } catch {
      notifyError("Could not copy. Long-press the QR to save instead.");
    }
  };

  const isPayDisabled = !nbcUrl;

  return (
    <div className={className}>
      {/* Bank selector chips */}
      <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
        {KHQR_BANK_OPTIONS.map((bank) => (
          <button
            key={bank.id}
            type="button"
            onClick={() => setSelectedBank(bank.id)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-white transition-opacity ${bank.chipClass} ${
              selectedBank === bank.id
                ? "opacity-100 ring-2 ring-white/40 ring-offset-1"
                : "opacity-45 hover:opacity-70"
            }`}
          >
            <span>{bank.initials}</span>
            <span className="hidden sm:inline">{bank.label}</span>
          </button>
        ))}
      </div>

      {/* Primary CTA */}
      <button
        type="button"
        onClick={onPay}
        disabled={isPayDisabled}
        className="brand-primary-button flex w-full items-center justify-center gap-3 rounded-full px-4 py-3.5 text-sm font-bold disabled:opacity-50"
      >
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg text-[10px] font-bold text-white ${selected.chipClass}`}
        >
          {selected.initials}
        </span>
        Pay with {selected.label}
      </button>

      {/* Secondary actions */}
      <div className="mt-3 flex items-center justify-center gap-3 text-[11px]">
        <button
          type="button"
          onClick={() => void onCopyQr()}
          className="rounded-full border border-(--border) px-3 py-1 font-semibold text-(--text-muted) hover:border-(--primary) hover:text-foreground"
        >
          Copy KHQR
        </button>
      </div>

      <p className="mt-2 text-center text-[11px] leading-relaxed text-(--text-muted)">
        Or scan the QR with any KHQR-enabled banking app. We detect payment automatically.
      </p>
    </div>
  );
}
