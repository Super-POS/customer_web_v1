import type { KhqrBankId } from "@/lib/khqr-bank-links";

/**
 * Bank-app native pay URLs (custom URL schemes).
 *
 * Important: ABA’s `type=payway&qrcode=` only accepts KHQR from the PayWay / ABA QR API
 * (ABA merchant MID + PayWay tags). A Bakong NBC KHQR triggers “Invalid Qr Merchant Data”.
 * ABA pre-fill via deeplink requires a separate PayWay integration — until then customers
 * scan the on-screen Bakong KHQR inside ABA Mobile.
 */
export function buildBankNativePayUrl(
  bankId: KhqrBankId,
  _qr: string,
  options?: { abaPaywayDeeplink?: string | null },
): string | null {
  if (bankId === "aba" && options?.abaPaywayDeeplink?.trim()) {
    return options.abaPaywayDeeplink.trim();
  }

  switch (bankId) {
    case "aba":
    case "bakong":
    case "nbc":
      return null;
    case "wing":
    case "acleda":
      return null;
    default:
      return null;
  }
}

export function bankUsesNbcDeeplink(bankId: KhqrBankId): boolean {
  return bankId === "bakong";
  // return bankId === "bakong" || bankId === "nbc";
}
