"use client";

import { AppShell } from "@/components/AppShell";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function RootFrame({ children }: { children: ReactNode }) {
  const path = usePathname();
  if (path === "/welcome") {
    return <div className="ff-site min-h-dvh">{children}</div>;
  }
  return (
    <div className="ff-phone mx-auto min-h-dvh w-full max-w-md shadow-[0_0_80px_rgba(0,0,0,0.45)]">
      <AppShell>{children}</AppShell>
    </div>
  );
}
