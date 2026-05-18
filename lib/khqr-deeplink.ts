import {
  getKhqrBankUrlCandidates,
  type KhqrBankId,
  type KhqrBankLinkInput,
} from "@/lib/khqr-bank-links";
import { isTelegramWebApp } from "@/lib/khqr-device";

export { isMobilePayDevice } from "@/lib/khqr-device";

function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function isCustomAppUrl(url: string): boolean {
  return !isHttpUrl(url);
}

/** Programmatic navigation that works better than assign() for custom schemes on mobile. */
function clickNavigate(url: string): void {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.style.display = "none";
  anchor.setAttribute("rel", "noopener noreferrer");
  document.body.appendChild(anchor);
  anchor.click();
  window.setTimeout(() => anchor.remove(), 200);
}

/**
 * Bridge page opened via Telegram `openLink` (system browser). QR must be in the URL —
 * sessionStorage from the Mini App is not available there.
 */
export function buildKhqrPayOpenBridgeUrl(
  bankId: KhqrBankId,
  input: KhqrBankLinkInput,
): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://localhost";
  const url = new URL("/pay/open", origin);
  url.searchParams.set("bank", bankId);
  url.searchParams.set("qr", input.qr.trim());
  const short = input.deeplink?.trim();
  const full = input.deeplink_full?.trim();
  if (short) url.searchParams.set("deeplink", short);
  if (full) url.searchParams.set("deeplink_full", full);
  return url.toString();
}

/**
 * Try one or more URLs (custom schemes / intents). For multiple URLs, fires quick
 * sequential attempts — same pattern NBC uses on their redirect page.
 */
export function tryOpenDeepLinks(urls: string[]): void {
  const list = urls.map((u) => u.trim()).filter(Boolean);
  if (list.length === 0) return;

  let index = 0;
  const openNext = () => {
    if (index >= list.length) return;
    const url = list[index++];
    if (isHttpUrl(url)) {
      window.location.assign(url);
      return;
    }
    clickNavigate(url);
    if (index < list.length) {
      window.setTimeout(openNext, 350);
    }
  };

  openNext();
}

/**
 * Opens NBC https links or native bank schemes. In Telegram Mini App, https links use
 * `WebApp.openLink`; native schemes use `/pay/open` in the system browser.
 */
export function openKhqrDeepLink(deeplink: string): void {
  const url = deeplink.trim();
  if (!url) return;

  const tg = window.Telegram?.WebApp as
    | { openLink?: (link: string, options?: { try_instant_view?: boolean }) => void }
    | undefined;

  if (tg?.openLink && isHttpUrl(url) && isTelegramWebApp()) {
    tg.openLink(url, { try_instant_view: false });
    return;
  }

  if (isCustomAppUrl(url)) {
    clickNavigate(url);
    return;
  }

  window.location.assign(url);
}

export type OpenKhqrBankAppOptions = {
  /** Pass from `useAuth().isTelegramWebApp` when inside React. */
  inTelegram?: boolean;
};

/**
 * Open the selected bank app for a KHQR payment.
 * Telegram: ABA / ACLEDA / Wing → external browser bridge (QR in URL).
 * Telegram: Bakong / Other → NBC https via `openLink`.
 */
export function openKhqrBankApp(
  bankId: KhqrBankId,
  input: KhqrBankLinkInput,
  options?: OpenKhqrBankAppOptions,
): void {
  const urls = getKhqrBankUrlCandidates(bankId, input);
  if (urls.length === 0) return;

  const inTg = options?.inTelegram ?? isTelegramWebApp();
  const tg = window.Telegram?.WebApp as
    | { openLink?: (link: string, options?: { try_instant_view?: boolean }) => void }
    | undefined;

  if (inTg && tg?.openLink) {
    if (bankId === "bakong" || bankId === "nbc") {
      const https = urls.find(isHttpUrl);
      if (https) {
        tg.openLink(https, { try_instant_view: false });
        return;
      }
    }

    if (urls.some(isCustomAppUrl)) {
      tg.openLink(buildKhqrPayOpenBridgeUrl(bankId, input), { try_instant_view: false });
      return;
    }
  }

  tryOpenDeepLinks(urls);
}
