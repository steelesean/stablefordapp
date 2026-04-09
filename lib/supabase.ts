import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client. Uses the service role key so it bypasses RLS —
 * safe because every access is gated by our own API routes and admin secret.
 *
 * Env vars (set in Vercel → Project → Settings → Environment Variables):
 *   SUPABASE_URL              — from Supabase → Project Settings → Data API
 *   SUPABASE_SERVICE_ROLE_KEY — from Supabase → Project Settings → API → service_role
 *
 * Lazy-initialized so missing env during build-time module evaluation doesn't crash.
 */

const g = globalThis as unknown as { __stablefordSupabase?: SupabaseClient };

function buildClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase env vars are not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getSupabase(): SupabaseClient {
  if (!g.__stablefordSupabase) g.__stablefordSupabase = buildClient();
  return g.__stablefordSupabase;
}

/** True if Supabase env is configured. Used to decide dev-mode fallback. */
export function supabaseConfigured(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
