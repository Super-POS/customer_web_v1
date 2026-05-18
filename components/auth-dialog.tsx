"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { useAuthModal } from "@/contexts/auth-modal-context";
import { apiErrorMessage, apiUrl } from "@/lib/api";
import { notifyError } from "@/lib/notify";
import { BrandLogo } from "./brand-logo";

/** Username (without @) of the bot configured with Telegram → /setdomain for this site. */
const TELEGRAM_LOGIN_BOT = (process.env.NEXT_PUBLIC_TELEGRAM_LOGIN_BOT || "").trim();
const TELEGRAM_AUTH_CALLBACK = "__club54OnTelegramAuth";

type TelegramLoginPayload = {
  id: number;
  auth_date: number;
  hash: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
};

declare global {
  interface Window {
    [TELEGRAM_AUTH_CALLBACK]?: (user: TelegramLoginPayload) => void;
  }
}

export function AuthDialog() {
  const { isOpen, tab, close, open } = useAuthModal();
  const { setToken, isTelegramWebApp } = useAuth();
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [tgExchanging, setTgExchanging] = useState(false);
  const tgMountRef = useRef<HTMLDivElement | null>(null);

  /**
   * The Telegram widget is useless inside the Mini App (the user is already signed
   * in via initData) and dangerous without `data-telegram-login` configured —
   * gate it on both. We also skip the widget when the bot username is unset.
   */
  const showTelegramLogin = !isTelegramWebApp && TELEGRAM_LOGIN_BOT.length > 0;

  useEffect(() => {
    if (!isOpen || !showTelegramLogin) return;
    const mountEl = tgMountRef.current;
    if (!mountEl) return;

    const exchangePayload = async (user: TelegramLoginPayload) => {
      setTgExchanging(true);
      try {
        const res = await fetch(apiUrl("/account/auth/telegram-login-widget"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...user, platform: "TelegramLoginWidget" }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(apiErrorMessage(data, "Telegram sign in failed"));
        }
        const next = (data as { token?: unknown }).token;
        if (typeof next !== "string" || !next) {
          throw new Error("Telegram sign in did not return a token.");
        }
        setToken(next);
        close();
      } catch (e) {
        notifyError(e instanceof Error ? e.message : "Telegram sign in failed");
      } finally {
        setTgExchanging(false);
      }
    };

    window[TELEGRAM_AUTH_CALLBACK] = (user) => {
      void exchangePayload(user);
    };

    while (mountEl.firstChild) mountEl.removeChild(mountEl.firstChild);
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", TELEGRAM_LOGIN_BOT);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "20");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-onauth", `${TELEGRAM_AUTH_CALLBACK}(user)`);
    mountEl.appendChild(script);

    return () => {
      delete window[TELEGRAM_AUTH_CALLBACK];
      while (mountEl.firstChild) mountEl.removeChild(mountEl.firstChild);
    };
  }, [isOpen, showTelegramLogin, setToken, close]);

  if (!isOpen) return null;

  const onLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/account/auth/login"), {
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
        notifyError("Invalid response");
      }
    } catch (e) {
      notifyError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body: { name: string; phone: string; password: string; email?: string } = {
        name: regName.trim(),
        phone: regPhone.trim(),
        password: regPass,
      };
      if (regEmail.trim()) body.email = regEmail.trim();
      const res = await fetch(apiUrl("/account/auth/register"), {
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
        notifyError("Invalid response");
      }
    } catch (e) {
      notifyError(e instanceof Error ? e.message : "Error");
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
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--text)_62%,transparent)] backdrop-blur-md"
        onClick={() => {
          close();
        }}
        aria-label="Close"
      />
      <div className="relative z-10 max-h-[min(100dvh,100svh)] w-full max-w-md overflow-y-auto sm:max-h-[90vh]">
        <div className="brand-card overflow-hidden rounded-t-[2rem] shadow-2xl sm:rounded-[2rem]">
          <div className="relative overflow-hidden border-b border-white/10 bg-[var(--text)] px-4 py-6 sm:px-8 sm:py-7">
            <div className="absolute -right-12 -top-16 h-32 w-32 rounded-full border-[0.8rem] border-[var(--primary)] border-r-transparent opacity-25" />
            <button
              type="button"
              onClick={() => {
                close();
              }}
              className="absolute right-3 top-3 rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <span className="sr-only">Close</span>
              <CloseIcon />
            </button>
            <div className="relative flex justify-center pr-8">
              <BrandLogo size="md" href={null} />
            </div>
          </div>
          <div className="px-6 pt-6 sm:px-8 sm:pt-8 pb-[max(1.5rem,env(safe-area-inset-bottom),var(--tg-safe-area-inset-bottom,0px))] sm:pb-[max(2rem,env(safe-area-inset-bottom),var(--tg-safe-area-inset-bottom,0px))]">
          <div className="mb-5 flex gap-1 rounded-full bg-[var(--page)] p-1 ring-1 ring-[var(--border)]">
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
                  open(x.id);
                }}
                className={
                  tab === x.id
                    ? "flex-1 rounded-full bg-[var(--surface)] py-2 text-sm font-bold text-[var(--text)] shadow-sm ring-1 ring-[var(--border)]"
                    : "flex-1 rounded-full py-2 text-sm font-semibold text-[var(--text-muted)] transition hover:text-[var(--text)]"
                }
              >
                {x.label}
              </button>
            ))}
          </div>
          {showTelegramLogin ? (
            <div className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--page)] px-4 py-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Quick sign in
              </p>
              <div ref={tgMountRef} className="flex justify-center" />
              {tgExchanging ? (
                <p className="mt-3 text-center text-[11px] text-[var(--text-muted)]">Signing you in with Telegram…</p>
              ) : (
                <p className="mt-3 text-center text-[11px] leading-relaxed text-[var(--text-muted)]">
                  Tap the blue button to continue with your Telegram account. We never see your password.
                </p>
              )}
              <div className="mt-4 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                <span className="h-px flex-1 bg-[var(--border)]" />
                or use email / phone
                <span className="h-px flex-1 bg-[var(--border)]" />
              </div>
            </div>
          ) : null}
          {tab === "login" ? (
            <form onSubmit={onLogin} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--text)]">Phone or email</label>
                <input
                  className="brand-input w-full rounded-xl px-3 py-2.5 text-[var(--text)]"
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--text)]">Password</label>
                <input
                  type="password"
                  className="brand-input w-full rounded-xl px-3 py-2.5 text-[var(--text)]"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="brand-primary-button w-full rounded-full py-3 text-sm font-bold disabled:opacity-50"
              >
                {loading ? "…" : "Sign in"}
              </button>
            </form>
          ) : (
            <form onSubmit={onRegister} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--text)]">Name</label>
                <input
                  className="brand-input w-full rounded-xl px-3 py-2.5 text-[var(--text)]"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--text)]">Phone</label>
                <input
                  className="brand-input w-full rounded-xl px-3 py-2.5 text-[var(--text)]"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--text)]">Email (optional)</label>
                <input
                  type="email"
                  className="brand-input w-full rounded-xl px-3 py-2.5 text-[var(--text)]"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--text)]">Password (min 6)</label>
                <input
                  type="password"
                  className="brand-input w-full rounded-xl px-3 py-2.5 text-[var(--text)]"
                  value={regPass}
                  onChange={(e) => setRegPass(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="brand-primary-button w-full rounded-full py-3 text-sm font-bold disabled:opacity-50"
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
