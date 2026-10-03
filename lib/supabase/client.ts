import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  cached =
    url && key
      ? createClient(url, key, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storage: typeof window === "undefined" ? undefined : window.localStorage,
          },
        })
      : null;
  return cached;
}

export function isCloudEnabled(): boolean {
  return getSupabase() !== null;
}
