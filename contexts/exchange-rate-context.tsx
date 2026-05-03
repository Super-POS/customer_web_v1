"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { FALLBACK_KHR_PER_USD, getPublicExchangeRateUrl } from "@/lib/api";

type Value = {
  khrPerUsd: number;
};

const Ctx = createContext<Value | null>(null);

export function ExchangeRateProvider({ children }: { children: ReactNode }) {
  const [khrPerUsd, setKhrPerUsd] = useState(FALLBACK_KHR_PER_USD);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(getPublicExchangeRateUrl());
        const body = (await res.json()) as { data?: { khr_per_usd?: unknown } };
        const v = Number(body?.data?.khr_per_usd);
        if (!cancelled && Number.isFinite(v) && v > 0) {
          setKhrPerUsd(v);
        }
      } catch {
        /* keep FALLBACK_KHR_PER_USD */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => ({ khrPerUsd }), [khrPerUsd]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** KHR amounts in the POS are converted with this rate for USD labels. */
export function useExchangeRate(): Value {
  const v = useContext(Ctx);
  return { khrPerUsd: v?.khrPerUsd ?? FALLBACK_KHR_PER_USD };
}
