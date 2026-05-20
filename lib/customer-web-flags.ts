/**
 * When true, the customer site focuses on menu + orders only. Wallet, rewards, and
 * in-app payment flows are hidden; customers pay at the physical cashier.
 * Set to false to show wallet, rewards, payments nav, profile balances, and web pay on orders.
 */
export const CUSTOMER_WEB_CASHIER_CHECKOUT_ONLY = false;

/**
 * Wallet Baray top-up (deposit form + modal). Not implemented for customers yet — keep false.
 * Set to true when deposit flow is ready to ship.
 */
export const CUSTOMER_WEB_WALLET_DEPOSIT_ENABLED = false;
