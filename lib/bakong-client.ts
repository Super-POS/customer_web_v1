import { fetchJson } from "@/lib/customer-fetch";
import {
  bakongOutcomeFromPoll,
  bakongWalletDepositOutcomeFromPoll,
  type BakongPaymentStatePayload,
  type BakongWalletDepositStatePayload,
} from "@/lib/bakong-payment";

/** Response of `POST /api/customer/payments/bakong/intent`. Matches `BakongCreateIntentResult` on the API. */
export type BakongIntent = {
  qr: string;
  md5: string;
  payment_transaction_id: number;
  expires_at: string;
  qr_amount: number;
  qr_currency: "USD" | "KHR";
  /** NBC short link — hosted redirect / bank picker. */
  deeplink?: string | null;
  /** Full NBC payment URL with embedded KHQR (per-bank deep links on mobile). */
  deeplink_full?: string | null;
};

/** Polling outcome from `parseBakongPaymentState`. Re-exported here so consumers have a single import surface. */
export type BakongPollOutcome = ReturnType<typeof bakongOutcomeFromPoll>;

/** POS-tested defaults — mirror `BakongPaidWatcherService` in web-v1. */
export const BAKONG_POLL_MS = 3_000;
export const BAKONG_TIMEOUT_MS = 10 * 60_000;

/** Create (or rotate) a KHQR intent for an order the signed-in customer owns. */
export async function createCustomerBakongIntent(
  token: string,
  orderId: number,
): Promise<BakongIntent> {
  const body = await fetchJson<{ data: BakongIntent; message?: string }>(
    "/customer/payments/bakong/intent",
    token,
    {
      method: "POST",
      body: JSON.stringify({ order_id: orderId }),
    },
  );
  if (!body?.data?.qr) {
    throw new Error("Bakong did not return a QR code.");
  }
  return body.data;
}

/** Mark a pending order KHQR as expired so a new QR can be generated. */
export async function abandonCustomerBakongPayment(
  token: string,
  orderId: number,
): Promise<void> {
  await fetchJson(`/customer/payments/bakong/order/${orderId}/abandon`, token, {
    method: "POST",
  });
}

/** Mark a pending wallet deposit KHQR as cancelled. */
export async function abandonCustomerBakongDeposit(
  token: string,
  walletTransactionId: number,
): Promise<void> {
  await fetchJson(`/customer/wallet/deposit/bakong/${walletTransactionId}/abandon`, token, {
    method: "POST",
  });
}

/** Cancel all pending Bakong wallet deposits for this customer. */
export async function abandonAllPendingBakongDeposits(token: string): Promise<void> {
  await fetchJson("/customer/wallet/deposit/bakong/abandon-pending", token, {
    method: "POST",
  });
}

/** One poll tick — returns `"wait" | "paid" | "cancelled" | "expired"`. Network failure → `"wait"`. */
export async function pollCustomerBakongState(
  token: string,
  orderId: number,
): Promise<BakongPollOutcome> {
  try {
    const res = await fetchJson<BakongPaymentStatePayload>(
      `/customer/payments/bakong/order/${orderId}/payment-state`,
      token,
    );
    return bakongOutcomeFromPoll(res);
  } catch {
    return "wait";
  }
}

/** Create a KHQR intent for a wallet top-up (amount in USD, same as the deposit form). */
export async function createCustomerBakongDepositIntent(
  token: string,
  amountUsd: number,
): Promise<BakongIntent & { wallet_transaction_id: number }> {
  const body = await fetchJson<{
    data: BakongIntent & { wallet_transaction_id: number };
    message?: string;
  }>("/customer/wallet/deposit/bakong/intent", token, {
    method: "POST",
    body: JSON.stringify({ amount: amountUsd }),
  });
  if (!body?.data?.qr) {
    throw new Error("Bakong did not return a QR code.");
  }
  return body.data;
}

export type BakongWalletDepositPollOutcome = ReturnType<typeof bakongWalletDepositOutcomeFromPoll>;

export async function pollCustomerBakongDepositState(
  token: string,
  walletTransactionId: number,
): Promise<BakongWalletDepositPollOutcome> {
  try {
    const res = await fetchJson<BakongWalletDepositStatePayload>(
      `/customer/wallet/deposit/${walletTransactionId}/payment-state`,
      token,
    );
    return bakongWalletDepositOutcomeFromPoll(res);
  } catch {
    return "wait";
  }
}
