import {
  getNbcKhqrUrl,
  type KhqrBankId,
  type KhqrBankLinkInput,
} from "@/lib/khqr-bank-links";
import {
  BANK_LAUNCHERS,
  buildAndroidIntentUrl,
  isAndroid,
  isIos,
} from "@/lib/khqr-bank-launchers";
import { isTelegramWebApp } from "@/lib/khqr-device";
import { telegramOpenExternalLink } from "@/lib/telegram-webapp";

export { isMobilePayDevice, canShowKhqrBankPicker } from "@/lib/khqr-device";

function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function openExternalUrl(url: string): void {
  if (isTelegramWebApp()) {
    telegramOpenExternalLink(url);
  } else {
    window.location.assign(url);
  }
}

export type OpenKhqrBankResult =
  | "opened-nbc-pay"  // NBC universal deeplink (Bakong / Other) — amount pre-filled
  | "opened-aba-pay"  // ABA deeplink with QR pre-filled
  | "opened-bridge"   // HTTPS bridge page opened (Telegram) — system browser handles the scheme
  | "opened-app"      // Bank app home screen launched — user must scan QR manually
  | "no-nbc-link"     // Wanted Bakong/NBC but no deeplink in intent
  | "unsupported";    // Unknown bankId or no launcher defined

/** Build the HTTPS bridge URL for the /pay/open page. Used inside Telegram where custom schemes are blocked. */
function buildBridgeUrl(bankId: KhqrBankId, qr: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/pay/open?bank=${bankId}&qr=${encodeURIComponent(qr)}`;
}

export function openKhqrBank(
  bankId: KhqrBankId,
  intent: KhqrBankLinkInput,
): OpenKhqrBankResult {
  // All banks: use the NBC universal KHQR deeplink.
  // On Android the OS shows a chooser with every installed KHQR app (ABA, ACLEDA, Wing, Bakong),
  // and whichever the user picks opens with the QR pre-filled.
  // On iOS the NBC-hosted page has per-bank buttons that each fire the correct app with QR pre-filled.
  // Custom schemes (abamobilebank://, acledabankqr://, …) only open the app home screen — no pre-fill.
  const nbc = getNbcKhqrUrl(intent);
  if (!nbc) return "no-nbc-link";

  // In Telegram, openLink only allows https:// — NBC link is already https so this works everywhere.
  openExternalUrl(nbc);
  return "opened-nbc-pay";
}

export function openKhqrDeepLink(deeplink: string): void {
  const url = deeplink.trim();
  if (!url || !isHttpUrl(url)) return;
  openExternalUrl(url);
}

/** Store URL for the given bank on the current platform. */
export function getBankStoreUrl(bankId: KhqrBankId): string | null {
  const launcher = BANK_LAUNCHERS[bankId];
  if (!launcher) return null;
  if (isAndroid()) return launcher.storeUrlAndroid ?? null;
  if (isIos()) return launcher.storeUrlIos ?? null;
  return null;
}
