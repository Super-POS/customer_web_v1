"use client";

import { useCallback, useEffect, useState } from "react";
import { AccountPageHeader } from "@/components/account-page-header";
import { SignInGate } from "@/components/sign-in-gate";
import { useAuth } from "@/lib/auth-context";
import { fetchJson } from "@/lib/customer-fetch";
import { notifyError } from "@/lib/notify";
import type {
  Mission,
  CustomerMission,
  CustomerMissionProgress,
  CustomerMissionStatus,
} from "@/lib/mission";

type Tab = "available" | "my";

function missionProgressPct(progress: number, target: number): number {
  if (!target || target <= 0) return 0;
  return Math.min(100, Math.round((progress / target) * 100));
}

function statusLabel(status: CustomerMissionStatus): string {
  if (status === "completed") return "Completed";
  if (status === "in_progress") return "In Progress";
  return "Pending";
}

function statusColor(status: CustomerMissionStatus): string {
  if (status === "completed") return "bg-green-100 text-green-800";
  if (status === "in_progress") return "bg-[var(--primary-soft)] text-[var(--primary-dark)]";
  return "bg-[var(--border)] text-[var(--text-muted)]";
}

function MissionSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-36 animate-pulse rounded-[1.75rem] bg-[color-mix(in_srgb,var(--border)_55%,white)]"
        />
      ))}
    </div>
  );
}

function MissionCard({
  mission,
  progress,
  onAccept,
  accepting,
}: {
  mission: Mission;
  progress?: CustomerMissionProgress | null;
  onAccept: (id: number) => void;
  accepting: boolean;
}) {
  const target = Number(mission.target_value ?? 0);
  const currentProgress = Number(progress?.progress ?? 0);
  const pct = missionProgressPct(currentProgress, target);
  const isAccepted = !!progress;
  const isCompleted = progress?.status === "completed";
  const rewardPts = Number(mission.reward_points ?? 0);
  const hasEndDate = !!mission.end_date;
  const daysLeft = hasEndDate
    ? Math.ceil(
        (new Date(mission.end_date!).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      )
    : null;

  return (
    <div
      className={`brand-card rounded-[1.75rem] p-5 transition ${isCompleted ? "opacity-75" : ""}`}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ${
            isCompleted
              ? "bg-green-100"
              : "bg-[var(--primary-soft)]"
          }`}
        >
          {isCompleted ? "✅" : (mission.icon ?? "🎯")}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="font-[family-name:var(--font-oswald)] text-lg font-bold leading-tight text-[var(--text)]">
              {mission.name}
            </h3>
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              {isAccepted && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${statusColor(progress!.status)}`}
                >
                  {statusLabel(progress!.status)}
                </span>
              )}
              {rewardPts > 0 && (
                <span className="rounded-full bg-[var(--primary)] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                  +{rewardPts.toLocaleString()} pts
                </span>
              )}
            </div>
          </div>

          {mission.description && (
            <p className="mt-1 text-sm text-[var(--text-muted)]">{mission.description}</p>
          )}

          {/* Meta row */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
            <span className="font-semibold">
              Goal: {target.toLocaleString()}{" "}
              {mission.requirement_type.replace(/_/g, " ")}
            </span>
            {daysLeft != null && daysLeft > 0 && !isCompleted && (
              <span className="text-amber-700">⏰ {daysLeft}d left</span>
            )}
            {mission.reward_description && (
              <span>🎁 {mission.reward_description}</span>
            )}
          </div>

          {/* Progress bar (only if accepted) */}
          {isAccepted && !isCompleted && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span className="font-bold">Progress</span>
                <span>
                  {currentProgress.toLocaleString()} / {target.toLocaleString()}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--border)]">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background: "linear-gradient(90deg, #7a1010, #c0392b)",
                  }}
                />
              </div>
            </div>
          )}

          {/* Accept button */}
          {!isAccepted && (
            <div className="mt-3">
              <button
                type="button"
                disabled={accepting}
                onClick={() => onAccept(mission.id)}
                className="brand-primary-button rounded-xl px-4 py-1.5 text-xs font-bold disabled:opacity-60"
              >
                {accepting ? "Joining…" : "Accept Mission"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MyMissionCard({ cm }: { cm: CustomerMission }) {
  const mission = cm.mission;
  const target = Number(mission?.target_value ?? 0);
  const currentProgress = Number(cm.progress ?? 0);
  const pct = missionProgressPct(currentProgress, target);
  const isCompleted = cm.status === "completed";
  const rewardPts = Number(mission?.reward_points ?? 0);

  return (
    <div
      className={`brand-card rounded-[1.75rem] p-5 ${isCompleted ? "opacity-80" : ""}`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ${
            isCompleted ? "bg-green-100" : "bg-[var(--primary-soft)]"
          }`}
        >
          {isCompleted ? "✅" : (mission?.icon ?? "🎯")}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="font-[family-name:var(--font-oswald)] text-lg font-bold leading-tight text-[var(--text)]">
              {mission?.name ?? "Mission"}
            </h3>
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${statusColor(cm.status)}`}
              >
                {statusLabel(cm.status)}
              </span>
              {rewardPts > 0 && (
                <span className="rounded-full bg-[var(--primary)] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                  +{rewardPts.toLocaleString()} pts
                </span>
              )}
            </div>
          </div>

          {mission?.description && (
            <p className="mt-1 text-sm text-[var(--text-muted)]">{mission.description}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
            {cm.accepted_at && (
              <span>
                Joined{" "}
                {new Date(cm.accepted_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
            {isCompleted && cm.completed_at && (
              <span className="font-bold text-green-700">
                ✓ Done{" "}
                {new Date(cm.completed_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
          </div>

          {!isCompleted && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span className="font-bold">Progress</span>
                <span>
                  {currentProgress.toLocaleString()} / {target.toLocaleString()}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--border)]">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background: "linear-gradient(90deg, #7a1010, #c0392b)",
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MissionsPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>("available");
  const [missions, setMissions] = useState<Mission[]>([]);
  const [myMissions, setMyMissions] = useState<CustomerMission[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(true);
  const [loadingMy, setLoadingMy] = useState(true);
  const [accepting, setAccepting] = useState<number | null>(null);

  const loadAvailable = useCallback(async () => {
    if (!token) return;
    setLoadingAvailable(true);
    try {
      const res = await fetchJson<{ data: Mission[] }>("/customer/missions", token);
      setMissions(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      notifyError(e instanceof Error ? e.message : "Failed to load missions.");
    } finally {
      setLoadingAvailable(false);
    }
  }, [token]);

  const loadMyMissions = useCallback(async () => {
    if (!token) return;
    setLoadingMy(true);
    try {
      const res = await fetchJson<{ data: CustomerMission[] }>("/customer/missions/my", token);
      setMyMissions(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      notifyError(e instanceof Error ? e.message : "Failed to load your missions.");
    } finally {
      setLoadingMy(false);
    }
  }, [token]);

  useEffect(() => {
    void loadAvailable();
    void loadMyMissions();
  }, [loadAvailable, loadMyMissions]);

  async function handleAccept(missionId: number) {
    if (!token) return;
    setAccepting(missionId);
    try {
      await fetchJson(`/customer/missions/${missionId}/accept`, token, { method: "POST" });
      await Promise.all([loadAvailable(), loadMyMissions()]);
    } catch (e) {
      notifyError(e instanceof Error ? e.message : "Failed to accept mission.");
    } finally {
      setAccepting(null);
    }
  }

  const acceptedIds = new Set(myMissions.map((cm) => cm.mission?.id));

  return (
    <SignInGate>
      <div className="brand-page max-w-3xl">
        <AccountPageHeader
          title="Missions"
          subtitle="Complete challenges to earn Impact Points and unlock stamps."
        />

        {/* Tab switcher */}
        <div className="mt-6 flex gap-2 rounded-2xl bg-[color-mix(in_srgb,var(--border)_40%,white)] p-1.5">
          {(["available", "my"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 rounded-xl py-2 text-sm font-bold transition ${
                tab === t
                  ? "bg-white shadow-sm text-[var(--primary-dark)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              {t === "available" ? "Available" : "My Missions"}
              {t === "my" && myMissions.length > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[10px] font-black text-white">
                  {myMissions.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Available missions */}
        {tab === "available" && (
          <div className="mt-5">
            {loadingAvailable ? (
              <MissionSkeleton />
            ) : missions.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-[var(--border)] bg-white/55 px-4 py-16 text-center">
                <p className="text-3xl">🎯</p>
                <p className="mt-3 font-bold text-[var(--text)]">No active missions right now</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Check back soon — new challenges are on the way!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {missions.map((m) => (
                  <MissionCard
                    key={m.id}
                    mission={m}
                    progress={
                      acceptedIds.has(m.id)
                        ? (myMissions.find((cm) => cm.mission?.id === m.id) ?? null)
                        : m.my_progress ?? null
                    }
                    onAccept={handleAccept}
                    accepting={accepting === m.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* My missions */}
        {tab === "my" && (
          <div className="mt-5">
            {loadingMy ? (
              <MissionSkeleton />
            ) : myMissions.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-[var(--border)] bg-white/55 px-4 py-16 text-center">
                <p className="text-3xl">📋</p>
                <p className="mt-3 font-bold text-[var(--text)]">No missions accepted yet</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Head to{" "}
                  <button
                    type="button"
                    className="font-bold text-[var(--primary)]"
                    onClick={() => setTab("available")}
                  >
                    Available
                  </button>{" "}
                  to pick your first challenge!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {myMissions.map((cm) => (
                  <MyMissionCard key={cm.id} cm={cm} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </SignInGate>
  );
}
