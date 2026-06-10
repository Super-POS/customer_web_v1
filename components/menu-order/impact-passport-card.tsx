"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { fetchJson } from "@/lib/customer-fetch";
import { CUSTOMER_WEB_CASHIER_CHECKOUT_ONLY } from "@/lib/customer-web-flags";
import { notifyError, notifySuccess } from "@/lib/notify";

type BadgeInfo = { name: string; icon?: string | null; description?: string | null };
type RankInfo = {
  name: string;
  icon?: string | null;
  level?: number;
  min_points?: number;
  max_points?: number | null;
  next_rank_name?: string | null;
  points_to_next?: number | null;
};
type QuestionItem = { id?: number; question: string; options: string[] };

type PassportData = {
  name: string;
  memberSince?: string | null;
  qrCode?: string | null;
  badge?: BadgeInfo | null;
  rank?: RankInfo | null;
  balance: number;
  totalEarned: number;
};

function rankProgress(totalEarned: number, rank?: RankInfo | null): number {
  if (!rank) return 0;
  const min = Number(rank.min_points ?? 0);
  const max = Number(rank.max_points ?? 0);
  if (!max || max <= min) return 100;
  return Math.min(100, Math.max(0, Math.round(((totalEarned - min) / (max - min)) * 100)));
}

export function ImpactPassportCard() {
  const { token } = useAuth();
  const [data, setData] = useState<PassportData | null>(null);
  const [loading, setLoading] = useState(false);

  // Badge questionnaire state
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [submittingBadge, setSubmittingBadge] = useState(false);
  const [badgeStep, setBadgeStep] = useState(0);
  const [badgeAnswers, setBadgeAnswers] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const calls: [
        Promise<{ data: { balance: number; total_earned?: number; rank?: RankInfo | null; badge?: BadgeInfo | null } }>,
        Promise<{ data: { user: { name: string; created_at?: string | null } | null } }>,
        Promise<{ data: { qr_code: string } }>,
      ] = [
        fetchJson("/customer/rewards", token),
        fetchJson("/customer/profile", token),
        fetchJson("/customer/profile/qr", token),
      ];
      const [rewardsRes, profileRes, qrRes] = await Promise.all(calls);
      setData({
        name: profileRes.data.user?.name ?? "Member",
        memberSince: profileRes.data.user?.created_at ?? null,
        qrCode: qrRes.data.qr_code ?? null,
        badge: rewardsRes.data.badge ?? null,
        rank: rewardsRes.data.rank ?? null,
        balance: Number(rewardsRes.data.balance ?? 0),
        totalEarned: Number(rewardsRes.data.total_earned ?? rewardsRes.data.balance ?? 0),
      });
    } catch {
      // silently skip — card just won't render
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleGetBadge() {
    if (!token) return;
    setLoadingQuestions(true);
    try {
      const res = await fetchJson<{ data: QuestionItem[] }>("/customer/rewards/badge/questions", token);
      const list = Array.isArray(res.data) ? res.data : [];
      setQuestions(list);
      setBadgeStep(0);
      setBadgeAnswers([]);
      setShowBadgeModal(true);
    } catch (e) {
      notifyError(e instanceof Error ? e.message : "Failed to load questions.");
    } finally {
      setLoadingQuestions(false);
    }
  }

  async function handleSubmitBadge(answers: string[]) {
    if (!token) return;
    setSubmittingBadge(true);
    try {
      const res = await fetchJson<{ data?: { badge?: BadgeInfo; rank?: RankInfo }; message?: string }>(
        "/customer/rewards/badge",
        token,
        { method: "POST", body: JSON.stringify({ answers }) },
      );
      const badge = res.data?.badge;
      if (badge) {
        setData((prev) => (prev ? { ...prev, badge } : prev));
        notifySuccess(res.message ?? `Badge assigned: ${badge.name} 🎉`);
      } else {
        notifySuccess(res.message ?? "Badge assigned! ✨");
        void load();
      }
      setShowBadgeModal(false);
      setQuestions([]);
    } catch (e) {
      notifyError(e instanceof Error ? e.message : "Failed to assign badge.");
    } finally {
      setSubmittingBadge(false);
    }
  }

  function closeBadgeModal() {
    setShowBadgeModal(false);
    setQuestions([]);
    setBadgeStep(0);
    setBadgeAnswers([]);
  }

  if (!token) return null;

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 pb-6 sm:px-6">
        <div
          className="h-56 animate-pulse rounded-[2rem]"
          style={{ background: "color-mix(in srgb, #6b1111 75%, black)" }}
        />
      </div>
    );
  }

  if (!data) return null;

  const progress = rankProgress(data.totalEarned, data.rank);
  const pointsToNext =
    data.rank?.points_to_next != null
      ? Number(data.rank.points_to_next)
      : data.rank?.max_points != null
        ? Math.max(0, Number(data.rank.max_points) - data.totalEarned)
        : null;

  const memberSinceStr = data.memberSince
    ? new Date(data.memberSince).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  const currentQuestion = questions[badgeStep];

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pb-6 sm:px-6">
        {/* Passport card */}
        <div
          className="relative overflow-hidden rounded-[2rem] p-6 text-white shadow-[0_32px_80px_-28px_rgba(60,5,5,0.55)] sm:p-7"
          style={{ background: "linear-gradient(135deg, #4e0808 0%, #8a1616 55%, #5c0d0d 100%)" }}
        >
          {/* Decorative rings */}
          <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full border-[3.5rem] border-white/[0.045]" />
          <div className="pointer-events-none absolute -bottom-16 left-[30%] h-64 w-64 rounded-full border-[3rem] border-white/[0.03]" />
          <div className="pointer-events-none absolute bottom-6 right-4 h-36 w-36 rounded-full border-[2rem] border-white/[0.04]" />

          <div className="relative flex items-start justify-between gap-4">
            {/* Left */}
            <div className="flex flex-col">
              <p className="font-[family-name:var(--font-oswald)] text-xl font-bold tracking-wide text-white">
                Club54
              </p>
              <p
                className="mt-0.5 text-[10px] font-black uppercase tracking-[0.22em]"
                style={{ color: "#c8a542" }}
              >
                Impact Passport
              </p>

              <div className="my-4 h-px bg-white/15" />

              <p className="text-[1.05rem] font-bold text-white">{data.name}</p>

              {/* Rank tier */}
              {data.rank && (
                <div className="mt-3 flex items-center gap-2.5">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg"
                    style={{
                      background: "rgba(200,165,66,0.15)",
                      border: "1.5px solid rgba(200,165,66,0.4)",
                    }}
                  >
                    {data.rank.icon ?? "☕"}
                  </div>
                  <div>
                    <p
                      className="text-[9px] font-black uppercase tracking-[0.2em]"
                      style={{ color: "#c8a542" }}
                    >
                      Rank Tier
                    </p>
                    <p className="text-sm font-black" style={{ color: "#e8c76a" }}>
                      {data.rank.name}
                    </p>
                  </div>
                </div>
              )}

              {/* Badge — shown when assigned, or a small "Get Badge" button */}
              {data.badge ? (
                <div className="mt-2.5 flex items-center gap-2.5">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      border: "1.5px solid rgba(255,255,255,0.18)",
                    }}
                  >
                    {data.badge.icon ?? "🏅"}
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50">
                      Badge Level
                    </p>
                    <p className="text-sm font-bold text-white/90">{data.badge.name}</p>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGetBadge}
                  disabled={loadingQuestions}
                  className="mt-2.5 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition disabled:opacity-50"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1.5px solid rgba(255,255,255,0.15)",
                    color: "rgba(255,255,255,0.65)",
                  }}
                >
                  {loadingQuestions ? (
                    <>
                      <span className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white/70" />
                      Loading…
                    </>
                  ) : (
                    <>✨ Get Badge</>
                  )}
                </button>
              )}

              {!CUSTOMER_WEB_CASHIER_CHECKOUT_ONLY && (
                <div className="mt-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50">
                    Impact Points
                  </p>
                  <p className="font-[family-name:var(--font-oswald)] text-[2.25rem] font-bold leading-tight">
                    {data.balance.toLocaleString()}
                  </p>
                </div>
              )}

              {memberSinceStr && (
                <div className="mt-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50">
                    Member Since
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-white">{memberSinceStr}</p>
                </div>
              )}
            </div>

            {/* Right: QR + watermark */}
            <div className="flex flex-col justify-between">
              {data.qrCode ? (
                <div className="overflow-hidden rounded-[1rem] bg-white p-1.5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={data.qrCode}
                    alt="My QR"
                    className="w-full rounded-sm object-contain"
                    draggable={false}
                  />
                </div>
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-[1rem] bg-white/10">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-8 w-8 text-white/35"
                  >
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="5" y="5" width="3" height="3" fill="currentColor" stroke="none" />
                    <rect x="16" y="5" width="3" height="3" fill="currentColor" stroke="none" />
                    <rect x="5" y="16" width="3" height="3" fill="currentColor" stroke="none" />
                  </svg>
                </div>
              )}
              <p
                className="mt-1 text-right font-[family-name:var(--font-oswald)] text-sm font-bold tracking-wide"
                style={{ color: "rgba(200,165,66,0.6)" }}
              >
                Club54
              </p>
            </div>
          </div>
        </div>

        {/* Progress strip */}
        {!CUSTOMER_WEB_CASHIER_CHECKOUT_ONLY && data.rank && (
          <div className="mt-2.5 overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-white/80 px-5 py-3.5 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-[var(--text)]">
                {pointsToNext != null && pointsToNext > 0
                  ? `${pointsToNext.toLocaleString()} points to ${data.rank.next_rank_name ?? "next rank"}`
                  : "Max rank reached"}
              </p>
              <div className="flex shrink-0 items-center gap-3">
                <div className="flex items-center gap-2">
                  <p className="tabular-nums text-sm font-bold text-[var(--text-muted)]">
                    {data.totalEarned.toLocaleString()} /{" "}
                    {data.rank.max_points != null ? data.rank.max_points.toLocaleString() : "∞"}
                  </p>
                  <span className="text-base">⭐</span>
                </div>
                <Link
                  href="/passport"
                  className="rounded-full border border-[var(--border)] bg-white/70 px-3 py-1 text-xs font-bold text-[var(--primary-dark)] transition hover:border-[var(--primary)] hover:bg-white"
                >
                  View journey →
                </Link>
              </div>
            </div>
            <div className="mt-2 h-[7px] overflow-hidden rounded-full bg-[var(--border)]">
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
      </div>

      {/* Badge questionnaire modal */}
      {showBadgeModal && currentQuestion && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
        >
          <div className="brand-card w-full max-w-md rounded-[2rem] p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <p className="brand-kicker">Personality Badge</p>
              <button
                type="button"
                onClick={closeBadgeModal}
                className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                Cancel
              </button>
            </div>

            {/* Progress bar */}
            <div className="mt-4 flex gap-1.5">
              {questions.map((_, i) => (
                <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
                  <div
                    className="h-full rounded-full bg-[var(--primary)] transition-all duration-500"
                    style={{ width: i <= badgeStep ? "100%" : "0%" }}
                  />
                </div>
              ))}
            </div>
            <p className="mt-1.5 text-right text-xs text-[var(--text-muted)]">
              {badgeStep + 1} / {questions.length}
            </p>

            <h2 className="mt-5 font-[family-name:var(--font-oswald)] text-xl font-bold leading-snug text-[var(--text)] sm:text-2xl">
              {currentQuestion.question}
            </h2>

            <ul className="mt-5 space-y-3">
              {currentQuestion.options.map((opt) => (
                <li key={opt}>
                  <button
                    type="button"
                    disabled={submittingBadge}
                    onClick={() => {
                      const next = [...badgeAnswers];
                      next[badgeStep] = opt;
                      setBadgeAnswers(next);
                      if (badgeStep === questions.length - 1) {
                        void handleSubmitBadge(next);
                      } else {
                        setBadgeStep((s) => s + 1);
                      }
                    }}
                    className="w-full rounded-2xl border border-[var(--border)] bg-white/60 px-5 py-4 text-left text-sm font-bold text-[var(--text)] transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary-dark)] disabled:opacity-50"
                  >
                    {opt}
                  </button>
                </li>
              ))}
            </ul>

            {submittingBadge && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[color-mix(in_srgb,var(--primary)_20%,white)] border-t-[var(--primary)]" />
                <p className="text-sm text-[var(--text-muted)]">Our AI is deciding your badge…</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
