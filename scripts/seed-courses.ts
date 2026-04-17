/**
 * One-off script to pre-populate the cached_courses table with popular UK clubs.
 *
 * Strategy: call GolfAPI.uk /clubs/nearby at ~30 major UK city coordinates with a
 * 50km radius. Dedupe results by id. Upsert into Supabase.
 *
 * Usage:
 *   npx tsx scripts/seed-courses.ts
 *
 * Requires env vars:
 *   GOLFAPI_UK_KEY
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Expected API call count: ~30 (one per city). Safe on the free tier (200/mo).
 */

import { searchNearby, isConfigured } from "../lib/golf-api";
import { upsertCachedCourses } from "../lib/course-cache";
import type { NormalisedCourse } from "../lib/golf-api";

// Major UK population centres. Adjust to broaden / narrow coverage.
const CITIES: { name: string; lat: number; lng: number }[] = [
  { name: "London",        lat: 51.5074, lng: -0.1278 },
  { name: "Birmingham",    lat: 52.4862, lng: -1.8904 },
  { name: "Manchester",    lat: 53.4808, lng: -2.2426 },
  { name: "Liverpool",     lat: 53.4084, lng: -2.9916 },
  { name: "Leeds",         lat: 53.8008, lng: -1.5491 },
  { name: "Sheffield",     lat: 53.3811, lng: -1.4701 },
  { name: "Bristol",       lat: 51.4545, lng: -2.5879 },
  { name: "Newcastle",     lat: 54.9783, lng: -1.6178 },
  { name: "Nottingham",    lat: 52.9548, lng: -1.1581 },
  { name: "Leicester",     lat: 52.6369, lng: -1.1398 },
  { name: "Coventry",      lat: 52.4068, lng: -1.5197 },
  { name: "Southampton",   lat: 50.9097, lng: -1.4044 },
  { name: "Portsmouth",    lat: 50.8198, lng: -1.0880 },
  { name: "Brighton",      lat: 50.8225, lng: -0.1372 },
  { name: "Cambridge",     lat: 52.2053, lng:  0.1218 },
  { name: "Oxford",        lat: 51.7520, lng: -1.2577 },
  { name: "Norwich",       lat: 52.6309, lng:  1.2974 },
  { name: "Plymouth",      lat: 50.3755, lng: -4.1427 },
  { name: "Exeter",        lat: 50.7184, lng: -3.5339 },
  { name: "Bournemouth",   lat: 50.7192, lng: -1.8808 },
  { name: "Cardiff",       lat: 51.4816, lng: -3.1791 },
  { name: "Swansea",       lat: 51.6214, lng: -3.9436 },
  { name: "Edinburgh",     lat: 55.9533, lng: -3.1883 },
  { name: "Glasgow",       lat: 55.8642, lng: -4.2518 },
  { name: "Aberdeen",      lat: 57.1497, lng: -2.0943 },
  { name: "Dundee",        lat: 56.4620, lng: -2.9707 },
  { name: "Inverness",     lat: 57.4778, lng: -4.2247 },
  { name: "Belfast",       lat: 54.5973, lng: -5.9301 },
  { name: "Derry",         lat: 54.9966, lng: -7.3086 },
  { name: "York",          lat: 53.9600, lng: -1.0873 },
];

const RADIUS_KM = 50;
const DELAY_MS = 12_000; // stay well under free-tier 5 req/min (= 12s between calls)

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  if (!isConfigured()) {
    console.error("GOLFAPI_UK_KEY is not set. Add it to .env.local and retry.");
    process.exit(1);
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Supabase env vars missing (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).");
    process.exit(1);
  }

  const byId = new Map<string, NormalisedCourse>();
  let apiCalls = 0;

  for (const city of CITIES) {
    try {
      console.log(`→ Fetching near ${city.name} (${city.lat}, ${city.lng}) r=${RADIUS_KM}km`);
      const clubs = await searchNearby(city.lat, city.lng, RADIUS_KM);
      apiCalls++;
      console.log(`  ${clubs.length} clubs`);
      for (const c of clubs) byId.set(c.id, c);
    } catch (err) {
      console.error(`  failed: ${(err as Error).message ?? err}`);
    }
    // Respect rate limit
    await sleep(DELAY_MS);
  }

  const all = Array.from(byId.values());
  console.log(`\nTotal unique clubs: ${all.length}  (API calls: ${apiCalls})`);

  if (all.length === 0) {
    console.log("Nothing to upsert. Exiting.");
    return;
  }

  // Upsert in batches of 100 to stay under Supabase's request size limits
  const BATCH = 100;
  for (let i = 0; i < all.length; i += BATCH) {
    const slice = all.slice(i, i + BATCH);
    await upsertCachedCourses(slice);
    console.log(`  upserted ${i + slice.length}/${all.length}`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
