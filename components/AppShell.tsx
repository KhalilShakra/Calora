"use client";

import { isAuthPath } from "@/lib/auth/paths";
import { initAuth, subscribeAuth } from "@/lib/auth/session";
import { getProfile, seedLocalCatalog } from "@/lib/actions";
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

        if (cloud && !inSession) {
          if (!isAuthPath(path)) router.replace("/login");
          return;
        }

        if (isAuthPath(path)) {
          if (inSession) {
            const profile = await getProfile();
            if (!cancelled) router.replace(profile?.onboardingCompletedAt ? "/" : "/onboarding");
          }
          return;
        }

        const profile = await getProfile();
        const onboarded = Boolean(profile?.onboardingCompletedAt);
        if (!onboarded && path !== "/onboarding") router.replace("/onboarding");
        if (onboarded && path === "/onboarding") router.replace("/");
      } catch {
        if (!cancelled && !isAuthPath(path) && path !== "/onboarding") {
          router.replace(isCloudEnabled() ? "/login" : "/onboarding");
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
        <p className="font-display text-lg tracking-wide">ForgeFuel</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex-1 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">{children}</main>
      <BottomNav />
      <Toast />
    </div>
  );
}
