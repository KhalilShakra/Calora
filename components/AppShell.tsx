"use client";

import { APP_NAME } from "@/design/brand";
import { isAuthPath } from "@/lib/auth/paths";
import { initAuth, subscribeAuth } from "@/lib/auth/session";
import { onboardingRouteState, seedLocalCatalog } from "@/lib/actions";
import { isCloudEnabled } from "@/lib/supabase/client";
import { useAuth } from "@/store/useAuth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { Toast } from "./Toast";

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [booted, setBooted] = useState(false);
  const signedIn = useAuth((s) => s.signedIn);

  useEffect(() => {
    let cancelled = false;
    const unsub = subscribeAuth();
    (async () => {
      try {
        const { db } = await import("@/lib/db");
        await db.open();
        await seedLocalCatalog();
        await initAuth();
      } finally {
        if (!cancelled) setBooted(true);
      }
    })();
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  useEffect(() => {
    if (!booted) return;
    let cancelled = false;
    (async () => {
      try {
        const inSession = useAuth.getState().signedIn;
        const cloud = isCloudEnabled();
        const { currentDone, returning } = await onboardingRouteState();
        if (cancelled) return;

        if (inSession) {
          if (!currentDone) {
            if (path !== "/onboarding") router.replace("/onboarding");
            return;
          }
          if (path === "/onboarding" || isAuthPath(path)) router.replace("/");
          return;
        }

        if (!returning) {
          if (path !== "/onboarding" && !isAuthPath(path)) router.replace("/welcome");
          return;
        }

        if (cloud) {
          if (!isAuthPath(path)) router.replace("/login");
          return;
        }

        if (currentDone && path === "/onboarding") router.replace("/");
        else if (!currentDone && !isAuthPath(path)) router.replace("/login");
      } catch {
        if (!cancelled && path !== "/onboarding" && !isAuthPath(path)) {
          router.replace("/onboarding");
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [booted, path, router, signedIn]);

  if (!ready) {
    return (
      <div className="grid min-h-dvh place-items-center text-ff-dim">
        <p className="font-display text-lg tracking-wide">{APP_NAME}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex-1 px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">{children}</main>
      <BottomNav />
      <Toast />
    </div>
  );
}
