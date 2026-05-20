import { fetchJson } from "@/lib/customer-fetch";
import {
  barayOutcomeFromPoll,
  barayWalletDepositOutcomeFromPoll,
  type BarayPaymentStatePayload,
  type BarayWalletDepositStatePayload,
} from "@/lib/baray-payment";

/** Response of `POST /api/customer/payments/baray/intent`. Matches `BarayCreateIntentResult` on the API. */
export type BarayIntent = {
  _id: string;
  url: string;
  status: string;
  expires_at: string;
  payment_transaction_id: number;
};

export type BarayPollOutcome = ReturnType<typeof barayOutcomeFromPoll>;

/** Baray checkout links are valid ~15 minutes on the server. */
export const BARAY_POLL_MS = 3_000;
export const BARAY_TIMEOUT_MS = 15 * 60_000;

export async function createCustomerBarayIntent(
  token: string,
  orderId: number,
): Promise<BarayIntent> {
  const body = await fetchJson<{ data: BarayIntent; message?: string }>(
    "/customer/payments/baray/intent",
    token,
    {
      method: "POST",
      body: JSON.stringify({ order_id: orderId }),
    },
  );
  if (!body?.data?.url?.trim()) {
    throw new Error("Baray did not return a pay link.");
  }
  return body.data;
}

export async function pollCustomerBarayState(
  token: string,
  orderId: number,
): Promise<BarayPollOutcome> {
  try {
    const res = await fetchJson<BarayPaymentStatePayload>(
      `/customer/payments/baray/order/${orderId}/payment-state`,
      token,
    );
    return barayOutcomeFromPoll(res);
  } catch {
    return "wait";
  }
}

export async function createCustomerBarayDepositIntent(
  token: string,
  amountUsd: number,
): Promise<BarayIntent & { wallet_transaction_id: number }> {
  const body = await fetchJson<{
    data: BarayIntent & { wallet_transaction_id: number };
    message?: string;
  }>("/customer/wallet/deposit/baray/intent", token, {
    method: "POST",
    body: JSON.stringify({ amount: amountUsd }),
  });
  if (!body?.data?.url?.trim()) {
    throw new Error("Baray did not return a pay link.");
  }
  return body.data;
}

export type BarayWalletDepositPollOutcome = ReturnType<typeof barayWalletDepositOutcomeFromPoll>;

export async function pollCustomerBarayDepositState(
  token: string,
  walletTransactionId: number,
): Promise<BarayWalletDepositPollOutcome> {
  try {
    const res = await fetchJson<BarayWalletDepositStatePayload>(
      `/customer/wallet/deposit/${walletTransactionId}/payment-state`,
      token,
    );
    return barayWalletDepositOutcomeFromPoll(res);
  } catch {
    return "wait";
  }
}
