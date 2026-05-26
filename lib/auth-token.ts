/** Matches api-v1 `RoleEnum.CUSTOMER` */
export const CUSTOMER_ROLE_ID = 3;

type JwtPayload = {
  user?: {
    roles?: { id: number; name?: string; is_default?: boolean }[];
  };
};

/** Decode JWT payload without verifying signature (client-side role check only). */
export function parseJwtPayload(token: string): JwtPayload | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function tokenHasCustomerRole(token: string): boolean {
  const payload = parseJwtPayload(token);
  const roles = payload?.user?.roles ?? [];
  return roles.some((r) => Number(r.id) === CUSTOMER_ROLE_ID);
}

export const STAFF_ACCOUNT_MESSAGE =
  "This account is for staff (POS/admin), not the customer app. Sign in with your customer phone or email, or register a new account.";

export const CUSTOMER_ACCESS_DENIED_MESSAGE =
  "Your session cannot book rooms. Please sign in with a customer account.";
