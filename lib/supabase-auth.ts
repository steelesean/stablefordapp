/**
 * Server-side Supabase client for organizer authentication.
 *
 * Reads the auth session from cookies (set by the browser client).
 * Used in Server Components, Route Handlers, and the proxy to verify
 * organizer identity.
 *
 * This client uses the anon key with RLS — unlike the service role client
 * in supabase.ts, it respects row-level security policies.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // During build this may not be set. Return null so getUser() returns null.
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Setting cookies fails in Server Components (read-only context).
          // This is expected — the session refresh happens in the proxy
          // or in Route Handlers where cookies are writable.
        }
      },
    },
  });
}

/**
 * Get the currently authenticated organizer's user, or null if not signed in.
 */
export async function getUser() {
  const supabase = await createServerSupabase();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
