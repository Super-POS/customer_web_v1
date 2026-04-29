"use client";

import { useAuthModal } from "@/contexts/auth-modal-context";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function AuthQuerySync() {
  const params = useSearchParams();
  const { open } = useAuthModal();

  useEffect(() => {
    const a = params.get("auth");
    if (a === "login" || a === "register") open(a);
  }, [params, open]);

  return null;
}
