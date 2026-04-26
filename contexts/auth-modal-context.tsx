"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Tab = "login" | "register";

type Value = {
  isOpen: boolean;
  tab: Tab;
  open: (t?: Tab) => void;
  close: () => void;
  openLogin: () => void;
  openRegister: () => void;
};

const Ctx = createContext<Value | null>(null);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("login");

  const open = useCallback((t: Tab = "login") => {
    setTab(t);
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);
  const openLogin = useCallback(() => open("login"), [open]);
  const openRegister = useCallback(() => open("register"), [open]);

  const value = useMemo(
    () => ({ isOpen, tab, open, close, openLogin, openRegister }),
    [isOpen, tab, open, close, openLogin, openRegister],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuthModal(): Value {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuthModal must be used within AuthModalProvider");
  return v;
}
