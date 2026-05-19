import { isTelegramWebAppRuntime } from "@/lib/telegram-webapp";

/** True on phones/tablets where Bakong bank-app deep links are useful. */
export function isMobilePayDevice(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    return true;
  }
  return navigator.maxTouchPoints > 1 && window.innerWidth < 900;
}

/** True when running inside the Telegram Mini App WebView. */
export function isTelegramWebApp(): boolean {
  return isTelegramWebAppRuntime();
}

/** Show ABA / ACLEDA / Wing buttons on mobile browsers and inside Telegram Mini App. */
export function canShowKhqrBankPicker(): boolean {
  return isMobilePayDevice() || isTelegramWebApp();
}
