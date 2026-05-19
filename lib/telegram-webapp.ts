/** Telegram Mini App helpers (SDK script loaded in root layout). */

export type TelegramWebAppApi = {
  initData?: string;
  version?: string;
  ready?: () => void;
  expand?: () => void;
  openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
};

export function getTelegramWebApp(): TelegramWebAppApi | undefined {
  if (typeof window === "undefined") return undefined;
  return window.Telegram?.WebApp as TelegramWebAppApi | undefined;
}

export function isTelegramWebAppRuntime(): boolean {
  if (typeof window === "undefined") return false;
  if (document.documentElement.dataset.telegramWebapp === "1") return true;
  const init = getTelegramWebApp()?.initData?.trim();
  return Boolean(init && init.length > 0);
}

/** Open an https URL or external bridge in the system browser (required for bank apps in Telegram). */
export function telegramOpenExternalLink(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  const tg = getTelegramWebApp();
  if (tg?.openLink) {
    tg.openLink(trimmed, { try_instant_view: false });
    return true;
  }
  window.open(trimmed, "_blank", "noopener,noreferrer");
  return true;
}
