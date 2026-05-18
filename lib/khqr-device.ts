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
  if (typeof window === "undefined") return false;
  if (document.documentElement.dataset.telegramWebapp === "1") return true;
  const init = window.Telegram?.WebApp?.initData?.trim();
  return Boolean(init && init.length > 0);
}
