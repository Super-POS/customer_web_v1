import { isMobilePayDevice } from "@/lib/khqr-device";

export type KhqrBankId = "aba" | "acleda" | "wing" | "bakong" | "nbc";

export type KhqrBankOption = {
  id: KhqrBankId;
  label: string;
  chipClass: string;
  initials: string;
};

export const KHQR_BANK_OPTIONS: KhqrBankOption[] = [
  { id: "aba", label: "ABA", chipClass: "bg-[#0057A8]", initials: "ABA" },
  { id: "acleda", label: "ACLEDA", chipClass: "bg-[#E31837]", initials: "AC" },
  { id: "wing", label: "Wing", chipClass: "bg-[#7B2D8E]", initials: "W" },
  { id: "bakong", label: "Bakong", chipClass: "bg-[#1A7F4E]", initials: "BK" },
  { id: "nbc", label: "Other bank", chipClass: "bg-[var(--text)]", initials: "…" },
];

export type KhqrBankLinkInput = {
  qr: string;
  deeplink?: string | null;
  deeplink_full?: string | null;
};

const ABA_PLAY_STORE =
  "https://play.google.com/store/apps/details?id=com.paygo24.ibank";
const ACLEDA_PLAY_STORE =
  "https://play.google.com/store/apps/details?id=com.domain.acledabankqr";
const WING_PLAY_STORE =
  "https://play.google.com/store/apps/details?id=com.wingmoney.wingpay";

function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent || "");
}

function encodedQr(qr: string): string {
  return encodeURIComponent(qr.trim());
}

function nbcHttpsLink(input: KhqrBankLinkInput): string | null {
  return input.deeplink_full?.trim() || input.deeplink?.trim() || null;
}

/** Ordered candidates — we try the first that applies on this device. */
export function getKhqrBankUrlCandidates(
  bankId: KhqrBankId,
  input: KhqrBankLinkInput,
): string[] {
  const qr = input.qr?.trim();
  if (!qr) return [];

  const enc = encodedQr(qr);
  const nbc = nbcHttpsLink(input);

  switch (bankId) {
    case "bakong":
    case "nbc":
      return nbc ? [nbc] : [];

    case "aba": {
      const candidates: string[] = [
        // PayWay documents: abamobilebank://ababank.com?type=payway&qrcode=...
        `abamobilebank://ababank.com?type=khqr&qrcode=${enc}`,
        `abamobilebank://ababank.com?qrcode=${enc}`,
      ];
      if (isAndroid()) {
        candidates.push(
          `intent://ababank.com/payment?qrcode=${enc}#Intent;scheme=abamobilebank;package=com.paygo24.ibank;S.browser_fallback_url=${encodeURIComponent(ABA_PLAY_STORE)};end`,
          `intent://com.paygo24.ibank/payment?qrcode=${enc}#Intent;scheme=https;package=com.paygo24.ibank;S.browser_fallback_url=${encodeURIComponent(ABA_PLAY_STORE)};end`,
        );
      }
      if (nbc) candidates.push(nbc);
      return candidates;
    }

    case "acleda": {
      const candidates: string[] = [
        `acledabankqr://payment?qr=${enc}`,
        `ACLEDAmobile://payment?qr=${enc}`,
      ];
      if (isAndroid()) {
        candidates.push(
          `intent://payment?qr=${enc}#Intent;scheme=acledabankqr;package=com.domain.acledabankqr;S.browser_fallback_url=${encodeURIComponent(ACLEDA_PLAY_STORE)};end`,
          `intent://com.domain.acledabankqr/payment?qr=${enc}#Intent;scheme=https;package=com.domain.acledabankqr;S.browser_fallback_url=${encodeURIComponent(ACLEDA_PLAY_STORE)};end`,
        );
      }
      if (nbc) candidates.push(nbc);
      return candidates;
    }

    case "wing": {
      const candidates: string[] = [
        `wingpay://payment?qrcode=${enc}`,
        `wingbank://payment?qrcode=${enc}`,
      ];
      if (isAndroid()) {
        candidates.push(
          `intent://payment?qrcode=${enc}#Intent;scheme=wingpay;package=com.wingmoney.wingpay;S.browser_fallback_url=${encodeURIComponent(WING_PLAY_STORE)};end`,
          `intent://com.wingmoney.wingpay/payment?qrcode=${enc}#Intent;scheme=https;package=com.wingmoney.wingpay;S.browser_fallback_url=${encodeURIComponent(WING_PLAY_STORE)};end`,
        );
      }
      if (nbc) candidates.push(nbc);
      return candidates;
    }

    default:
      return nbc ? [nbc] : [];
  }
}

/** @deprecated Use getKhqrBankUrlCandidates — returns first candidate only. */
export function buildKhqrBankPaymentUrl(
  bankId: KhqrBankId,
  input: KhqrBankLinkInput,
): string | null {
  const urls = getKhqrBankUrlCandidates(bankId, input);
  return urls[0] ?? null;
}

export function canShowKhqrBankPicker(): boolean {
  return isMobilePayDevice();
}
