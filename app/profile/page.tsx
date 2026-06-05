"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AccountPageHeader } from "@/components/account-page-header";
import { SignInGate } from "@/components/sign-in-gate";
import { formatUsdFromKhr } from "@/lib/api";
import { useExchangeRate } from "@/contexts/exchange-rate-context";
import { useAuth } from "@/lib/auth-context";
import { fetchJson } from "@/lib/customer-fetch";
import { notifyError, notifySuccess } from "@/lib/notify";
import { CUSTOMER_WEB_CASHIER_CHECKOUT_ONLY } from "@/lib/customer-web-flags";

type UserBrief = {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  avatar?: string | null;
};

type ProfilePayload = {
  data: {
    user: UserBrief | null;
    wallet: { balance: number };
    rewards: { balance: number; discount_value?: number };
    stats: {
      total_orders: number;
      total_spent: number;
      pending_orders: number;
      completed_orders: number;
    };
    recent_orders: Array<{
      id: number;
      receipt_number: string;
      total_price?: number | null;
      status: string;
      ordered_at?: string | null;
    }>;
  };
};

const PHONE_HINT = "Cambodia format: +855… or 0… (8–9 digits after prefix).";

export default function ProfilePage() {
  const { khrPerUsd } = useExchangeRate();
  const { token } = useAuth();
  const [overview, setOverview] = useState<ProfilePayload["data"] | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("");

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetchJson<ProfilePayload>("/customer/profile", token);
      const d = res.data;
      setOverview(d ?? null);
      if (d?.user) {
        setName(d.user.name ?? "");
        setPhone(d.user.phone ?? "");
        setEmail(d.user.email ?? "");
        setAvatar(d.user.avatar ?? "");
      }
    } catch {
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client data fetch on mount
    void load();
  }, [load]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSavingProfile(true);
    try {
      await fetchJson("/account/profile/update", token, {
        method: "PUT",
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          avatar: avatar.trim() || undefined,
        }),
      });
      notifySuccess("Profile updated.");
      await load();
    } catch (e) {
      notifyError(e instanceof Error ? e.message : "Could not update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (pw.length < 6 || pw !== pw2) {
      notifyError("Passwords must match and be at least 6 characters.");
      return;
    }
    setSavingPw(true);
    try {
      await fetchJson<{ message?: string }>("/account/profile/update-password", token, {
        method: "PUT",
        body: JSON.stringify({
          password: pw,
          confirm_password: pw2,
        }),
      });
      notifySuccess("Password updated.");
      setPw("");
      setPw2("");
    } catch (e) {
      notifyError(e instanceof Error ? e.message : "Could not update password");
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <SignInGate>
      <div className="brand-page max-w-4xl">
        <div className="flex items-start justify-between gap-4">
          <AccountPageHeader title="Profile" subtitle="Overview and account settings." />
          <Link
            href="/profile/qr"
            className="brand-card mt-px flex shrink-0 flex-col items-center gap-1 rounded-2xl px-4 py-3 text-center transition hover:brightness-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 text-[var(--primary)]">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="5" y="5" width="3" height="3" fill="currentColor" stroke="none" />
              <rect x="16" y="5" width="3" height="3" fill="currentColor" stroke="none" />
              <rect x="5" y="16" width="3" height="3" fill="currentColor" stroke="none" />
              <path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 20h3" />
            </svg>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">My QR</span>
          </Link>
        </div>

        {loading ? (
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl bg-[color-mix(in_srgb,var(--border)_55%,white)]"
              />
            ))}
          </div>
        ) : overview ? (
          <>
            <div
              className={
                CUSTOMER_WEB_CASHIER_CHECKOUT_ONLY
                  ? "mt-8 grid gap-4 sm:grid-cols-2"
                  : "mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
              }
            >
              {!CUSTOMER_WEB_CASHIER_CHECKOUT_ONLY && (
                <>
                  <div className="brand-card rounded-[1.5rem] p-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Wallet</p>
                    <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--primary)]">
                      {formatUsdFromKhr(Number(overview.wallet?.balance ?? 0), khrPerUsd)}
                    </p>
                  </div>
                  <div className="brand-card rounded-[1.5rem] p-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Reward pts</p>
                    <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--primary)]">
                      {Number(overview.rewards?.balance ?? 0)}
                    </p>
                  </div>
                </>
              )}
              <div className="brand-card rounded-[1.5rem] p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Orders</p>
                <p className="mt-2 text-2xl font-bold text-[var(--text)]">{overview.stats?.total_orders ?? 0}</p>
              </div>
              <div className="brand-card rounded-[1.5rem] p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Total spent</p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--text)]">
                  {formatUsdFromKhr(Number(overview.stats?.total_spent ?? 0), khrPerUsd)}
                </p>
              </div>
            </div>

            {(overview.recent_orders?.length ?? 0) > 0 && (
              <section className="mt-10">
                <h2 className="text-lg font-semibold text-[var(--text)]">Recent orders</h2>
                <ul className="mt-3 space-y-2">
                  {overview.recent_orders!.map((o) => (
                    <li key={o.id}>
                      <Link
                        href={`/orders/${o.id}`}
                        className="brand-card brand-card-hover flex items-center justify-between rounded-2xl px-4 py-3 text-sm"
                      >
                        <span className="font-medium text-[var(--text)]">#{o.receipt_number}</span>
                        <span className="tabular-nums text-[var(--text)]">
                          {formatUsdFromKhr(Number(o.total_price ?? 0), khrPerUsd)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        ) : (
          <p className="mt-8 text-sm text-red-700">Could not load profile overview.</p>
        )}

        <div className="mt-12 grid gap-10 lg:grid-cols-2">
          <form onSubmit={saveProfile} className="brand-card rounded-[1.75rem] p-6">
            <h2 className="text-lg font-semibold text-[var(--text)]">Contact details</h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{PHONE_HINT}</p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--text)]">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="brand-input w-full rounded-xl px-3 py-2.5 text-[var(--text)]"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--text)]">Phone</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="brand-input w-full rounded-xl px-3 py-2.5 text-[var(--text)]"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--text)]">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="brand-input w-full rounded-xl px-3 py-2.5 text-[var(--text)]"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--text)]">Avatar path (optional)</label>
                <input
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  className="brand-input w-full rounded-xl px-3 py-2.5 text-sm text-[var(--text)]"
                  placeholder="static/pos/user/avatar.png"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="brand-primary-button mt-6 w-full rounded-full py-3 text-sm font-bold disabled:opacity-50"
            >
              {savingProfile ? "Saving…" : "Save profile"}
            </button>
          </form>

          <form onSubmit={savePassword} className="brand-card rounded-[1.75rem] p-6">
            <h2 className="text-lg font-semibold text-[var(--text)]">Change password</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--text)]">New password</label>
                <input
                  type="password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  minLength={6}
                  className="brand-input w-full rounded-xl px-3 py-2.5 text-[var(--text)]"
                  autoComplete="new-password"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--text)]">Confirm password</label>
                <input
                  type="password"
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  minLength={6}
                  className="brand-input w-full rounded-xl px-3 py-2.5 text-[var(--text)]"
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={savingPw}
              className="brand-secondary-button mt-6 w-full rounded-full py-3 text-sm font-bold disabled:opacity-50"
            >
              {savingPw ? "Updating…" : "Update password"}
            </button>
          </form>
        </div>
      </div>
    </SignInGate>
  );
}
