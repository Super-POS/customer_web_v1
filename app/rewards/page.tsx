"use client";

import { useCallback, useEffect, useState } from "react";
import { AccountPageHeader } from "@/components/account-page-header";
import { SignInGate } from "@/components/sign-in-gate";
import { useAuth } from "@/lib/auth-context";
import { fetchJson } from "@/lib/customer-fetch";
import { notifyError, notifySuccess } from "@/lib/notify";
import { CUSTOMER_WEB_CASHIER_CHECKOUT_ONLY } from "@/lib/customer-web-flags";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

type RankInfo = {
  name: string;
  level?: number;
  min_points?: number;
  max_points?: number | null;
  next_rank_name?: string | null;
  icon?: string | null;
  color?: string | null;
};

type BadgeInfo = {
  id?: number;
  name: string;
  description?: string | null;
  icon?: string | null;
};

type PointHistory = {
  id: number;
  points: number;
  type?: string | null;
  note?: string | null;
  created_at?: string | null;
};

type RewardsProfile = {
  balance: number;
  rank?: RankInfo | null;
  badge?: BadgeInfo | null;
  history?: PointHistory[];
};

type QuestionItem = {
  id?: number;
  question: string;
  options: string[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RANK_COLORS: Record<string, string> = {
  bronze: "#cd7f32",
  silver: "#9ca3af",
  gold: "#f59e0b",
  platinum: "#6366f1",
  diamond: "#06b6d4",
  default: "#da291c",
};

function rankColor(rank?: RankInfo | null): string {
  if (!rank?.name) return RANK_COLORS.default;
  const key = rank.name.toLowerCase();
  for (const [k, v] of Object.entries(RANK_COLORS)) {
    if (key.includes(k)) return v;
  }
  return rank.color ?? RANK_COLORS.default;
}

function rankProgress(balance: number, rank?: RankInfo | null): number {
  if (!rank) return 0;
  const min = Number(rank.min_points ?? 0);
  const max = Number(rank.max_points ?? 0);
  if (!max || max <= min) return 100;
  return Math.min(100, Math.max(0, Math.round(((balance - min) / (max - min)) * 100)));
}

function formatPts(n: number): string {
  return n.toLocaleString() + " pts";
}

function historyLabel(tx: PointHistory): string {
  const t = String(tx.type ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return tx.note ? `${t} — ${tx.note}` : t || "Points";
}

function ptsBadgeClass(points: number): string {
  if (points > 0) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (points < 0) return "bg-red-50 text-red-700 ring-red-200";
  return "bg-[var(--primary-soft)] text-[var(--primary-dark)] ring-[var(--border)]";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RankHeroCard({
  balance,
  rank,
}: {
  balance: number;
  rank?: RankInfo | null;
}) {
  const color = rankColor(rank);
  const progress = rankProgress(balance, rank);
  const nextPts = rank?.max_points ? Number(rank.max_points) - balance : null;

  return (
    <section
      className="relative overflow-hidden rounded-[2rem] p-6 text-white shadow-[0_28px_80px_-42px_rgba(36,23,15,0.85)] sm:p-8"
      style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${color} 85%, black) 0%, color-mix(in srgb, ${color} 60%, black) 100%)` }}
    >
      <div
        className="absolute -right-20 -top-24 h-64 w-64 rounded-full blur-2xl"
        style={{ background: `${color}4d` }}
      />
      <div className="absolute bottom-0 right-8 h-32 w-32 rounded-full border-[1rem] border-white/10 border-r-transparent" />

      <div className="relative">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-white/60">Loyalty Points</p>

        <div className="mt-3 flex items-end gap-4">
          <p className="font-[family-name:var(--font-oswald)] text-[clamp(2.5rem,8vw+1rem,3.75rem)] font-bold leading-none tracking-tight">
            {balance.toLocaleString()}
          </p>
          <p className="mb-1 text-sm font-bold text-white/70">pts</p>
        </div>

        {rank && (
          <div className="mt-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {rank.icon && (
                  <span className="text-xl">{rank.icon}</span>
                )}
                <span className="text-sm font-black uppercase tracking-wide text-white">
                  {rank.name}
                </span>
              </div>
              {rank.next_rank_name && (
                <span className="text-xs text-white/55">
                  Next: {rank.next_rank_name}
                </span>
              )}
            </div>

            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white/80 transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-1.5 flex justify-between text-xs text-white/50">
              <span>{rank.min_points?.toLocaleString() ?? 0} pts</span>
              {rank.max_points ? (
                <span>
                  {nextPts != null && nextPts > 0
                    ? `${nextPts.toLocaleString()} more to ${rank.next_rank_name ?? "next rank"}`
                    : rank.max_points.toLocaleString() + " pts"}
                </span>
              ) : (
                <span>Max rank 🏆</span>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            ["Rank", rank?.name ?? "—"],
            ["Level", rank?.level != null ? `#${rank.level}` : "—"],
            ["Balance", formatPts(balance)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/48">{label}</p>
              <p className="mt-0.5 text-sm font-bold text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BadgeCard({
  badge,
  onGetBadge,
  loadingQuestions,
}: {
  badge?: BadgeInfo | null;
  onGetBadge: () => void;
  loadingQuestions: boolean;
}) {
  if (badge) {
    return (
      <section className="brand-card rounded-[2rem] p-6 sm:p-8">
        <p className="brand-kicker">Your Badge</p>
        <div className="mt-4 flex items-center gap-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-4xl shadow-inner">
            {badge.icon ?? "🏅"}
          </div>
          <div>
            <h2 className="font-[family-name:var(--font-oswald)] text-2xl font-bold text-[var(--text)]">
              {badge.name}
            </h2>
            {badge.description && (
              <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
                {badge.description}
              </p>
            )}
          </div>
        </div>
        <p className="mt-4 text-xs text-[var(--text-muted)]">
          Your badge was assigned by our AI based on your coffee personality. ✨
        </p>
      </section>
    );
  }

  return (
    <section className="brand-card rounded-[2rem] p-6 sm:p-8">
      <p className="brand-kicker">Personality Badge</p>
      <h2 className="mt-2 font-[family-name:var(--font-oswald)] text-2xl font-bold text-[var(--text)]">
        Discover your badge
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
        Answer a few short questions and our AI will assign you a unique badge that matches your coffee personality.
      </p>
      <button
        type="button"
        onClick={onGetBadge}
        disabled={loadingQuestions}
        className="brand-primary-button mt-5 w-full rounded-full py-3 text-sm font-black disabled:opacity-50"
      >
        {loadingQuestions ? "Loading questions…" : "Get My Badge ✨"}
      </button>
    </section>
  );
}

function BadgeQuestionnaire({
  questions,
  onSubmit,
  onCancel,
  submitting,
}: {
  questions: QuestionItem[];
  onSubmit: (answers: string[]) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);

  const current = questions[step];
  const isLast = step === questions.length - 1;

  function pick(option: string) {
    const next = [...answers];
    next[step] = option;
    setAnswers(next);

    if (isLast) {
      onSubmit(next);
    } else {
      setStep((s) => s + 1);
    }
  }

  if (!current) return null;

  return (
    <section className="brand-card rounded-[2rem] p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <p className="brand-kicker">Personality Badge</p>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          Cancel
        </button>
      </div>

      {/* Progress */}
      <div className="mt-4 flex gap-1.5">
        {questions.map((_, i) => (
          <div
            key={i}
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--border)]"
          >
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-all duration-500"
              style={{ width: i <= step ? "100%" : "0%" }}
            />
          </div>
        ))}
      </div>

      <p className="mt-1.5 text-right text-xs text-[var(--text-muted)]">
        {step + 1} / {questions.length}
      </p>

      <h2 className="mt-5 font-[family-name:var(--font-oswald)] text-xl font-bold leading-snug text-[var(--text)] sm:text-2xl">
        {current.question}
      </h2>

      <ul className="mt-5 space-y-3">
        {current.options.map((opt) => (
          <li key={opt}>
            <button
              type="button"
              disabled={submitting}
              onClick={() => pick(opt)}
              className="w-full rounded-2xl border border-[var(--border)] bg-white/60 px-5 py-4 text-left text-sm font-bold text-[var(--text)] transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary-dark)] disabled:opacity-50"
            >
              {opt}
            </button>
          </li>
        ))}
      </ul>

      {submitting && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[color-mix(in_srgb,var(--primary)_20%,white)] border-t-[var(--primary)]" />
          <p className="text-sm text-[var(--text-muted)]">Our AI is deciding your badge…</p>
        </div>
      )}
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RewardsPage() {
  const router = useRouter();
  const { token } = useAuth();

  const [profile, setProfile] = useState<RewardsProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [questions, setQuestions] = useState<QuestionItem[] | null>(null);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [submittingBadge, setSubmittingBadge] = useState(false);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);

  const [historyPage, setHistoryPage] = useState(1);
  const HIST_PAGE_SIZE = 10;

  useEffect(() => {
    if (CUSTOMER_WEB_CASHIER_CHECKOUT_ONLY) router.replace("/");
  }, [router]);

  const loadProfile = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetchJson<{ data: RewardsProfile }>("/customer/rewards", token);
      setProfile(res.data ?? null);
    } catch (e) {
      notifyError(e instanceof Error ? e.message : "Failed to load rewards.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProfile();
  }, [loadProfile]);

  async function handleGetBadge() {
    if (!token) return;
    setLoadingQuestions(true);
    try {
      const res = await fetchJson<{ data: QuestionItem[] | { questions: QuestionItem[] } }>(
        "/customer/rewards/badge/questions",
        token,
      );
      // Handle both { data: [...] } and { data: { questions: [...] } }
      const raw = res.data;
      const list = Array.isArray(raw) ? raw : (raw as { questions?: QuestionItem[] }).questions ?? [];
      setQuestions(list);
      setShowQuestionnaire(true);
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
      const res = await fetchJson<{ data?: { badge?: BadgeInfo }; message?: string }>(
        "/customer/rewards/badge",
        token,
        { method: "POST", body: JSON.stringify({ answers }) },
      );
      const badge = res.data?.badge;
      if (badge) {
        setProfile((prev) => (prev ? { ...prev, badge } : prev));
        notifySuccess(res.message ?? `Badge assigned: ${badge.name} 🎉`);
      } else {
        notifySuccess(res.message ?? "Badge assigned! ✨");
        await loadProfile();
      }
      setShowQuestionnaire(false);
      setQuestions(null);
    } catch (e) {
      notifyError(e instanceof Error ? e.message : "Failed to assign badge.");
    } finally {
      setSubmittingBadge(false);
    }
  }

  if (CUSTOMER_WEB_CASHIER_CHECKOUT_ONLY) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-[var(--text-muted)]">Redirecting…</p>
      </div>
    );
  }

  const history = profile?.history ?? [];
  const totalHistPages = Math.max(1, Math.ceil(history.length / HIST_PAGE_SIZE));
  const pagedHistory = history.slice((historyPage - 1) * HIST_PAGE_SIZE, historyPage * HIST_PAGE_SIZE);

  return (
    <SignInGate>
      <div className="brand-page max-w-3xl">
        <AccountPageHeader
          title="Rewards"
          subtitle="Earn points with every order. Level up, collect your badge."
        />

        {loading ? (
          <div className="mt-8 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-[2rem] bg-[color-mix(in_srgb,var(--border)_55%,white)]" />
            ))}
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            {/* Rank hero */}
            <RankHeroCard balance={profile?.balance ?? 0} rank={profile?.rank} />

            {/* Badge section */}
            {showQuestionnaire && questions ? (
              <BadgeQuestionnaire
                questions={questions}
                onSubmit={handleSubmitBadge}
                onCancel={() => { setShowQuestionnaire(false); setQuestions(null); }}
                submitting={submittingBadge}
              />
            ) : (
              <BadgeCard
                badge={profile?.badge}
                onGetBadge={handleGetBadge}
                loadingQuestions={loadingQuestions}
              />
            )}

            {/* Points history */}
            <section className="brand-card rounded-[2rem] p-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="brand-kicker">Activity</p>
                  <h2 className="mt-1 font-[family-name:var(--font-oswald)] text-2xl font-bold text-[var(--text)]">
                    Points history
                  </h2>
                </div>
                <p className="text-sm font-bold text-[var(--text-muted)]">{history.length} entries</p>
              </div>

              {history.length === 0 ? (
                <p className="mt-5 rounded-2xl border border-dashed border-[var(--border)] bg-white/55 px-4 py-10 text-center text-sm text-[var(--text-muted)]">
                  No points activity yet. Place your first order to start earning!
                </p>
              ) : (
                <>
                  <ul className="mt-5 divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-white/52">
                    {pagedHistory.map((tx) => (
                      <li
                        key={tx.id}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 text-sm transition hover:bg-white/70"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-[var(--text)] truncate">{historyLabel(tx)}</p>
                          {tx.created_at && (
                            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                              {new Date(tx.created_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ring-1 ${ptsBadgeClass(tx.points)}`}
                        >
                          {tx.points > 0 ? "+" : ""}{tx.points} pts
                        </span>
                      </li>
                    ))}
                  </ul>

                  {totalHistPages > 1 && (
                    <div className="mt-6 flex items-center justify-center gap-4">
                      <button
                        type="button"
                        disabled={historyPage <= 1}
                        onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                        className="brand-secondary-button rounded-full px-4 py-2 text-sm font-bold disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <span className="text-sm font-bold text-[var(--text-muted)]">
                        {historyPage} / {totalHistPages}
                      </span>
                      <button
                        type="button"
                        disabled={historyPage >= totalHistPages}
                        onClick={() => setHistoryPage((p) => p + 1)}
                        className="brand-secondary-button rounded-full px-4 py-2 text-sm font-bold disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </SignInGate>
  );
}
