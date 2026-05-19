/**
 * Fallback app launchers when NBC `generate_deeplink_by_qr` does not return a link.
 * Primary pay path for all banks is the NBC https deeplink (pre-filled amount).
 *
 * These launchers only open the bank app home screen — customer must scan the QR.
 *
 *  - On Android the most reliable way to launch a specific bank app is an
 *    `intent:#Intent;action=...MAIN;category=...LAUNCHER;package=PKG;...;end`
 *    URI — that asks Android to start the app's launcher activity, and falls
 *    through to the Play Store URL if the app isn't installed.
 *  - On iOS we have to guess one or more custom URL schemes. None of them are
 *    officially documented for these Cambodian bank apps, so we try the most
 *    likely candidates in order; if all of them silently fail the customer
 *    still sees the App Store fallback button on the bridge page.
 */

import type { KhqrBankId } from "@/lib/khqr-bank-links";

export type BankLauncher = {
  /** Android package name (used for `intent://` URI). */
  androidPackage?: string;
  /**
   * Custom URL schemes to try on iOS — best-effort. Tried in order; the first
   * one that opens an installed app wins. None of these are officially
   * documented, so we keep multiple candidates per bank.
   */
  iosSchemes?: string[];
  /** Public store URL — used as `browser_fallback_url` on Android and manual fallback on iOS. */
  storeUrlAndroid?: string;
  storeUrlIos?: string;
};

export const BANK_LAUNCHERS: Partial<Record<KhqrBankId, BankLauncher>> = {
  aba: {
    androidPackage: "com.paygo24.ibank",
    // `abamobilebank://...` is the scheme used by PayWay's `abapay_deeplink`
    // (see https://developer.payway.com.kh/aba-qr-api). Keep `abamobile` as a
    // legacy fallback just in case older versions of the app are installed.
    iosSchemes: ["abamobilebank", "abamobile"],
    storeUrlAndroid:
      "https://play.google.com/store/apps/details?id=com.paygo24.ibank",
    storeUrlIos: "https://apps.apple.com/kh/app/aba-mobile-bank/id968860649",
  },
  acleda: {
    // Current Play Store package — the old `com.acleda.toanchet` was retired
    // when ACLEDA migrated to their "Super App" build.
    androidPackage: "com.domain.acledabankqr",
    iosSchemes: ["acledamobile", "acledabankqr", "acleda"],
    storeUrlAndroid:
      "https://play.google.com/store/apps/details?id=com.domain.acledabankqr",
    storeUrlIos: "https://apps.apple.com/kh/app/acleda-mobile/id1196285236",
  },
  wing: {
    androidPackage: "com.wingmoney.wingpay",
    iosSchemes: ["wingbank", "wingmoney", "wingpay", "wing"],
    storeUrlAndroid:
      "https://play.google.com/store/apps/details?id=com.wingmoney.wingpay",
    storeUrlIos: "https://apps.apple.com/kh/app/wing-bank/id1113286385",
  },
};

export function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent || "");
}

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPhone|iPad|iPod/i.test(ua) || (/Mac/.test(ua) && navigator.maxTouchPoints > 1);
}

/**
 * Build an `intent:` URI that asks Android to launch the given package's main
 * launcher activity. If the app is not installed Chrome / Android falls back
 * to the Play Store link.
 *
 * We deliberately use `action=android.intent.action.MAIN` +
 * `category=android.intent.category.LAUNCHER` (rather than an empty
 * `scheme=https` form) because that's the canonical way to "just open this
 * app" without a specific deep link — and it's the form that has worked
 * reliably across Chrome / Samsung Internet / Firefox on Android.
 */
export function buildAndroidIntentUrl(launcher: BankLauncher): string | null {
  if (!launcher.androidPackage) return null;
  const parts = [
    "action=android.intent.action.MAIN",
    "category=android.intent.category.LAUNCHER",
    `package=${launcher.androidPackage}`,
  ];
  if (launcher.storeUrlAndroid) {
    parts.push(
      `S.browser_fallback_url=${encodeURIComponent(launcher.storeUrlAndroid)}`,
    );
  }
  return `intent:#Intent;${parts.join(";")};end`;
}
