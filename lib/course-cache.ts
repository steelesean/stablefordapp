/**
 * Cache layer for GolfAPI.uk course data.
 *
 * - Searches go against Postgres (instant, no API call) via trigram + FTS index.
 * - Upserts happen whenever we fetch fresh data from the live API.
 *
 * Cache is considered "warm" if `fetched_at` is within 90 days. Beyond that
 * we'll still return the cached row but a background refresh could be added later.
 */

import { getSupabase } from "./supabase";
import type { NormalisedCourse } from "./golf-api";

const CACHE_TABLE = "cached_courses";

interface DbCourseRow {
  id: string;
  name: string;
  county: string | null;
  lat: number | null;
  lng: number | null;
  tees: unknown;
  hole_count: number;
  fetched_at: string;
}

function rowToCourse(row: DbCourseRow): NormalisedCourse {
  const tees = Array.isArray(row.tees) ? (row.tees as NormalisedCourse["tees"]) : [];
  return {
    id: row.id,
    name: row.name,
    county: row.county ?? undefined,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    holeCount: row.hole_count,
    tees,
  };
}

/**
 * Search the cache by name. Uses ILIKE for simplicity — the trigram index
 * makes this fast even on tens of thousands of rows.
 *
 * Returns up to `limit` matches, ordered by name.
 */
export async function searchCachedCourses(
  query: string,
  limit = 10,
): Promise<NormalisedCourse[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(CACHE_TABLE)
    .select("*")
    .ilike("name", `%${trimmed}%`)
    .order("name")
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map((r) => rowToCourse(r as DbCourseRow));
}

/**
 * Load a single cached course by id, or null if not cached.
 */
export async function getCachedCourse(id: string): Promise<NormalisedCourse | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(CACHE_TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToCourse(data as DbCourseRow) : null;
}

/**
 * Upsert one or many courses into the cache. Idempotent — safe to call
 * whenever fresh data comes back from the API.
 */
export async function upsertCachedCourses(courses: NormalisedCourse[]): Promise<void> {
  if (courses.length === 0) return;
  const supabase = getSupabase();
  const rows = courses.map((c) => ({
    id: c.id,
    name: c.name,
    county: c.county ?? null,
    lat: c.lat ?? null,
    lng: c.lng ?? null,
    tees: c.tees,
    hole_count: c.holeCount,
    fetched_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from(CACHE_TABLE).upsert(rows, { onConflict: "id" });
  if (error) throw error;
}
