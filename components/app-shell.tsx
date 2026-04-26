import type { ReactNode } from "react";
import { AppHeader } from "./app-header";
import { AuthDialog } from "./auth-dialog";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader />
      <div className="flex-1">{children}</div>
      <AuthDialog />
    </div>
  );
}
