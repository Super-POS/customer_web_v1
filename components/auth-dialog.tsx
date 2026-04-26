"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { useAuthModal } from "@/contexts/auth-modal-context";
import { apiErrorMessage, getApiBaseUrl } from "@/lib/api";
import { BrandLogo } from "./brand-logo";

export function AuthDialog() {
  const { isOpen, tab, close, open } = useAuthModal();
  const { setToken } = useAuth();
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const onLogin = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/account/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUser, password: loginPass, platform: "Web" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(data, "Sign in failed"));
      if (typeof data.token === "string") {
        setToken(data.token);
        close();
        setLoginPass("");
      } else {
        setErr("Invalid response");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const body: { name: string; phone: string; password: string; email?: string } = {
        name: regName.trim(),
        phone: regPhone.trim(),
        password: regPass,
      };
      if (regEmail.trim()) body.email = regEmail.trim();
      const res = await fetch(`${getApiBaseUrl()}/api/account/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(data, "Registration failed"));
      if (typeof data.token === "string") {
        setToken(data.token);
        close();
        setRegPass("");
      } else {
        setErr("Invalid response");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={() => {
          setErr("");
          close();
        }}
        aria-label="Close"
      />
      <div className="relative z-10 w-full max-w-md sm:max-h-[90vh] sm:overflow-y-auto">
        <div className="overflow-hidden rounded-t-3xl border border-slate-200/80 bg-white shadow-2xl sm:rounded-3xl">
          <div className="relative border-b border-slate-800/80 bg-slate-950 px-4 py-5 sm:px-8 sm:py-6">
            <button
              type="button"
              onClick={() => {
                setErr("");
                close();
              }}
              className="absolute right-3 top-3 rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <span className="sr-only">Close</span>
              <CloseIcon />
            </button>
            <div className="flex justify-center pr-8">
              <BrandLogo size="md" href={null} />
            </div>
          </div>
          <div className="p-6 sm:p-8">
          <div className="mb-5 flex gap-1 rounded-xl bg-slate-100 p-1">
            {(
              [
                { id: "login" as const, label: "Sign in" },
                { id: "register" as const, label: "Register" },
              ] as const
            ).map((x) => (
              <button
                key={x.id}
                type="button"
                onClick={() => {
                  setErr("");
                  open(x.id);
                }}
                className={
                  tab === x.id
                    ? "flex-1 rounded-lg bg-white py-2 text-sm font-semibold text-slate-900 shadow-sm"
                    : "flex-1 rounded-lg py-2 text-sm font-medium text-slate-500 transition hover:text-slate-800"
                }
              >
                {x.label}
              </button>
            ))}
          </div>
          {err && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
              {err}
            </p>
          )}
          {tab === "login" ? (
            <form onSubmit={onLogin} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Phone or email</label>
                <input
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
                <input
                  type="password"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[var(--primary)] py-3 text-sm font-semibold text-white shadow-sm hover:bg-[var(--primary-dark)] disabled:opacity-50"
              >
                {loading ? "…" : "Sign in"}
              </button>
            </form>
          ) : (
            <form onSubmit={onRegister} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
                <input
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
                <input
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email (optional)</label>
                <input
                  type="email"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Password (min 6)</label>
                <input
                  type="password"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                  value={regPass}
                  onChange={(e) => setRegPass(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[var(--primary)] py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {loading ? "…" : "Create account"}
              </button>
            </form>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
