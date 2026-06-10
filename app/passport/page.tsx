"use client";

import { useCallback, useEffect, useState } from "react";
import { AccountPageHeader } from "@/components/account-page-header";
import { SignInGate } from "@/components/sign-in-gate";
import { useAuth } from "@/lib/auth-context";
import { fetchJson } from "@/lib/customer-fetch";
import { notifyError } from "@/lib/notify";
import { CUSTOMER_WEB_CASHIER_CHECKOUT_ONLY } from "@/lib/customer-web-flags";
import { useRouter } from "next/navigation";

type RankInfo = {
  name: string;
  level?: number;
  min_points?: number;
  max_points?: number | null;
  next_rank_name?: string | null;
  points_to_next?: number | null;
  icon?: string | null;
};

type BadgeInfo = { name: string; icon?: string | null };

type RewardsProfile = {
  balance: number;
  total_earned?: number;
  rank?: RankInfo | null;
  badge?: BadgeInfo | null;
};

type RankTier = {
  tier: number;
  label: string;
  min_points: number;
  icon?: string | null;
};

function rankProgress(totalEarned: number, rank?: RankInfo | null): number {
  if (!rank) return 0;
  const min = Number(rank.min_points ?? 0);
  const max = Number(rank.max_points ?? 0);
  if (!max || max <= min) return 100;
  return Math.min(100, Math.max(0, Math.round(((totalEarned - min) / (max - min)) * 100)));
}

export default function PassportPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [profile, setProfile] = useState<RewardsProfile | null>(null);
  const [tiers, setTiers] = useState<RankTier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (CUSTOMER_WEB_CASHIER_CHECKOUT_ONLY) router.replace("/");
  }, [router]);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [profileRes, tiersRes] = await Promise.all([
        fetchJson<{ data: RewardsProfile }>("/customer/rewards", token),
        fetchJson<{ data: RankTier[] }>("/customer/rewards/tiers", token),
      ]);
      setProfile(profileRes.data ?? null);
      setTiers(Array.isArray(tiersRes.data) ? tiersRes.data : []);
    } catch (e) {
      notifyError(e instanceof Error ? e.message : "Failed to load passport.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (CUSTOMER_WEB_CASHIER_CHECKOUT_ONLY) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-[var(--text-muted)]">Redirecting…</p>
      </div>
    );
  }

  const totalEarned = Number(profile?.total_earned ?? profile?.balance ?? 0);
  const progress = rankProgress(totalEarned, profile?.rank);
  const pointsToNext =
    profile?.rank?.points_to_next != null
      ? Number(profile.rank.points_to_next)
      : profile?.rank?.max_points != null
        ? Math.max(0, Number(profile.rank.max_points) - totalEarned)
        : null;

  return (
    <SignInGate>
      <div className="brand-page max-w-3xl">
        <AccountPageHeader
          title="Passport"
          subtitle="Your impact journey and achievement collection."
        />

        {loading ? (
          <div className="mt-6 space-y-3">
            <div className="h-28 animate-pulse rounded-[2rem] bg-[color-mix(in_srgb,var(--border)_55%,white)]" />
            <div className="h-96 animate-pulse rounded-[2rem] bg-[color-mix(in_srgb,var(--border)_55%,white)]" />
            <div className="h-48 animate-pulse rounded-[2rem] bg-[color-mix(in_srgb,var(--border)_55%,white)]" />
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {/* Points summary */}
            {profile && (
              <section className="brand-card rounded-[2rem] p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-[var(--text-muted)]">
                      Impact Points
                    </p>
                    <p className="mt-1 font-[family-name:var(--font-oswald)] text-4xl font-bold leading-none text-[var(--primary)]">
                      {(profile.balance ?? 0).toLocaleString()}
                      <span className="ml-1.5 text-lg font-semibold text-[var(--text-muted)]">pts</span>
                    </p>
                  </div>
                  {profile.rank && (
                    <div className="flex items-center gap-2 rounded-2xl bg-[var(--primary-soft)] px-4 py-2.5">
                      {profile.rank.icon && (
                        <span className="text-xl">{profile.rank.icon}</span>
                      )}
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--primary-dark)]/60">
                          Rank
                        </p>
                        <p className="text-sm font-black text-[var(--primary-dark)]">
                          {profile.rank.name}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                {profile.rank && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                      <span className="font-bold">
                        {pointsToNext != null && pointsToNext > 0
                          ? `${pointsToNext.toLocaleString()} pts to ${profile.rank.next_rank_name ?? "next rank"}`
                          : "Max rank reached 🏆"}
                      </span>
                      <span>
                        {totalEarned.toLocaleString()} /{" "}
                        {profile.rank.max_points != null
                          ? profile.rank.max_points.toLocaleString()
                          : "∞"}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--border)]">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${progress}%`,
                          background: "linear-gradient(90deg, #7a1010, #c0392b)",
                        }}
                      />
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* My Journey — rank tier timeline */}
            {tiers.length > 0 && (
              <section className="brand-card rounded-[2rem] p-6">
                <p className="brand-kicker">Progress</p>
                <h2 className="mt-1 font-[family-name:var(--font-oswald)] text-2xl font-bold text-[var(--text)]">
                  My Journey
                </h2>

                <ul className="mt-6 space-y-0">
                  {tiers.map((tier, i) => {
                    const nextTier = tiers[i + 1];
                    const isLast = i === tiers.length - 1;
                    const passed =
                      nextTier != null && totalEarned >= nextTier.min_points;
                    const isCurrent = profile?.rank?.level === tier.tier;
                    const isLocked = !passed && !isCurrent;

                    return (
                      <li key={tier.tier} className="flex gap-4">
                        {/* Left column: node + connecting line */}
                        <div className="flex flex-col items-center">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl transition ${
                              isCurrent
                                ? "bg-[var(--primary)] text-white shadow-[0_4px_18px_-4px_rgba(122,16,16,0.5)]"
                                : passed
                                  ? "bg-[var(--primary-soft)] text-[var(--primary-dark)]"
                                  : "border-2 border-[var(--border)] bg-white/60 text-[var(--text-muted)]"
                            }`}
                          >
                            {isLocked ? (
                              <span className="text-base">🔒</span>
                            ) : (
                              <span>{tier.icon ?? "☕"}</span>
                            )}
                          </div>
                          {!isLast && (
                            <div
                              className={`my-1 w-0.5 flex-1 rounded-full ${
                                passed ? "bg-[var(--primary-soft)]" : "bg-[var(--border)]"
                              }`}
                              style={{ minHeight: "1.75rem" }}
                            />
                          )}
                        </div>

                        {/* Right column: text */}
                        <div className={`flex-1 pb-6 pt-2 ${isLast ? "pb-0" : ""}`}>
                          <div className="flex flex-wrap items-center gap-2">
                            <p
                              className={`text-base font-bold ${
                                isCurrent
                                  ? "text-[var(--primary)]"
                                  : isLocked
                                    ? "text-[var(--text-muted)]"
                                    : "text-[var(--text)]"
                              }`}
                            >
                              {tier.label}
                            </p>
                            {isCurrent && (
                              <span className="rounded-full bg-[var(--primary)] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                                Current
                              </span>
                            )}
                            {passed && !isCurrent && (
                              <span className="text-sm font-bold text-[var(--primary)]">✓</span>
                            )}
                          </div>
                          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                            {tier.min_points.toLocaleString()} points
                            {isCurrent && pointsToNext != null && pointsToNext > 0 && nextTier && (
                              <span className="ml-2 font-bold text-[var(--primary)]">
                                · {pointsToNext.toLocaleString()} to next
                              </span>
                            )}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* Your Collection — badge stamps */}
            <section className="brand-card rounded-[2rem] p-6">
              <p className="brand-kicker">Achievements</p>
              <h2 className="mt-1 font-[family-name:var(--font-oswald)] text-2xl font-bold text-[var(--text)]">
                Your Collection
              </h2>

              {!profile?.badge ? (
                <p className="mt-5 rounded-2xl border border-dashed border-[var(--border)] bg-white/55 px-4 py-10 text-center text-sm text-[var(--text-muted)]">
                  No badges yet. Tap{" "}
                  <span className="font-bold text-[var(--text)]">✨ Get Badge</span> on the home
                  page to earn your first one!
                </p>
              ) : (
                <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {/* Earned badge */}
                  <div className="flex flex-col items-center gap-2 rounded-2xl bg-[var(--primary-soft)] p-4 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)] text-2xl text-white shadow-sm">
                      {profile.badge.icon ?? "🏅"}
                    </div>
                    <p className="text-[11px] font-bold leading-tight text-[var(--primary-dark)]">
                      {profile.badge.name}
                    </p>
                  </div>

                  {/* Locked placeholder slots */}
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-[var(--border)] bg-white/40 p-4 text-center"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-[var(--border)] text-xl text-[var(--text-muted)]">
                        ?
                      </div>
                      <p className="text-[10px] font-bold text-[var(--text-muted)]">Locked</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </SignInGate>
  );
}
