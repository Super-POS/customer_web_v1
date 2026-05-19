export type KhqrBankId = "aba" | "acleda" | "wing" | "bakong" | "nbc";

export type KhqrBankOption = {
  id: KhqrBankId;
  label: string;
  chipClass: string;
  initials: string;
  /** True if this bank supports opening with QR pre-filled; false = opens app home, user scans. */
  prefillsQr: boolean;
};

export const KHQR_BANK_OPTIONS: KhqrBankOption[] = [
  { id: "bakong", label: "Bakong", chipClass: "bg-[#1A7F4E]", initials: "BK", prefillsQr: true },
  { id: "aba",    label: "ABA",    chipClass: "bg-[#0057A8]", initials: "ABA", prefillsQr: true },
  { id: "acleda", label: "ACLEDA", chipClass: "bg-[#E31837]", initials: "AC", prefillsQr: false },
  { id: "wing",   label: "Wing",   chipClass: "bg-[#7B2D8E]", initials: "W",  prefillsQr: false },
  { id: "nbc",    label: "Other",  chipClass: "bg-[var(--text-muted)]", initials: "…", prefillsQr: true },
];

export type KhqrBankLinkInput = {
  qr: string;
  deeplink?: string | null;
  deeplink_full?: string | null;
};

/** NBC Bakong hosted pay link. */
export function getNbcKhqrUrl(input: KhqrBankLinkInput): string | null {
  const short = input.deeplink?.trim();
  if (short) return short;
  const full = input.deeplink_full?.trim();
  if (full) return full;
  return null;
}

export { canShowKhqrBankPicker } from "@/lib/khqr-device";
