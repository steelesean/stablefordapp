/**
 * Browser-side Supabase client for organizer authentication.
 *
 * Uses the anon key (safe to expose) with cookie-based session persistence
 * via @supabase/ssr. Only used for auth flows — all player-facing data
 * access goes through API routes using the service role key.
 *
 * Env vars (must be prefixed NEXT_PUBLIC_ so they're bundled into client JS):
 *   NEXT_PUBLIC_SUPABASE_URL      — same value as SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY — from Supabase → Project Settings → API → anon
 */

import { createBrowserClient } from "@supabase/ssr";

let cached: ReturnType<typeof createBrowserClient> | null = null;

export function createBrowserSupabase() {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // During build / SSR prerender these vars may not exist.
    // Return a dummy that will be replaced on the client.
    if (typeof window === "undefined") {
      return null as unknown as ReturnType<typeof createBrowserClient>;
    }
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Set them in .env.local or Vercel env vars.",
    );
  }

  cached = createBrowserClient(url, anonKey);
  return cached;
}
