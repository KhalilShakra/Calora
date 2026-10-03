import { migrateLocalVaultToUser } from "@/lib/auth/identity";
import { hydrateCloudUser } from "@/lib/sync/cloud";
import { getSupabase, isCloudEnabled } from "@/lib/supabase/client";
import { persistUserId, useAuth } from "@/store/useAuth";
import { LOCAL_USER_ID } from "@/types";
import type { User } from "@supabase/supabase-js";

export async function applySignedInUser(user: User, sync = true): Promise<void> {
  persistUserId(user.id);
  useAuth.getState().setAuth({
    ready: true,
    userId: user.id,
    email: user.email ?? null,
    signedIn: true,
  });
  await migrateLocalVaultToUser(user.id);
  if (sync && typeof navigator !== "undefined" && navigator.onLine) {
    try {
      await hydrateCloudUser(user.id);
    } catch {
      /* Dexie stays usable; push retries after later writes */
    }
  }
}

export async function initAuth(): Promise<void> {
  if (!isCloudEnabled()) {
    persistUserId(LOCAL_USER_ID);
    useAuth.getState().setAuth({
      ready: true,
      userId: LOCAL_USER_ID,
      email: null,
      signedIn: false,
    });
    return;
  }

  const supabase = getSupabase();
  if (!supabase) {
    useAuth.getState().setAuth({ ready: true, userId: LOCAL_USER_ID, email: null, signedIn: false });
    return;
  }

  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) {
    persistUserId(LOCAL_USER_ID);
    useAuth.getState().setAuth({
      ready: true,
      userId: LOCAL_USER_ID,
      email: null,
      signedIn: false,
    });
    return;
  }

  await applySignedInUser(user);
}

export function subscribeAuth(): () => void {
  const supabase = getSupabase();
  if (!supabase) return () => undefined;

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === "INITIAL_SESSION") return;
    if (event === "SIGNED_OUT" || !session?.user) {
      persistUserId(LOCAL_USER_ID);
      useAuth.getState().setAuth({
        ready: true,
        userId: LOCAL_USER_ID,
        email: null,
        signedIn: false,
      });
      return;
    }
    if (event === "TOKEN_REFRESHED") {
      useAuth.getState().setAuth({
        userId: session.user.id,
        email: session.user.email ?? null,
        signedIn: true,
        ready: true,
      });
      return;
    }
    if (event === "SIGNED_IN" || event === "USER_UPDATED") {
      void applySignedInUser(session.user, event === "SIGNED_IN");
    }
  });

  return () => data.subscription.unsubscribe();
}

export async function signOut(): Promise<void> {
  const supabase = getSupabase();
  if (supabase) await supabase.auth.signOut();
  persistUserId(LOCAL_USER_ID);
  useAuth.getState().setAuth({
    ready: true,
    userId: LOCAL_USER_ID,
    email: null,
    signedIn: false,
  });
}
