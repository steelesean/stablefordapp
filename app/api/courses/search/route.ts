import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase-auth";
import { searchCachedCourses, upsertCachedCourses } from "@/lib/course-cache";
import { isConfigured, searchNearby } from "@/lib/golf-api";

export const dynamic = "force-dynamic";

/**
 * GET /api/courses/search
 *
 * Query params (any of):
 *   q         — name search, checks local cache
 *   lat, lng  — geolocation search, hits GolfAPI.uk and warms the cache
 *   radius    — optional, km (default 25)
 *
 * Either `q` or `lat+lng` is required.
 * Returns: { courses: NormalisedCourse[], source: "cache" | "live" }
 */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");
  const radiusStr = searchParams.get("radius");

  // Geolocation branch — live search, then cache
  if (latStr && lngStr) {
    const lat = Number(latStr);
    const lng = Number(lngStr);
    const radius = radiusStr ? Number(radiusStr) : 25;
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(radius)) {
      return NextResponse.json({ error: "Invalid lat/lng/radius" }, { status: 400 });
    }
    if (!isConfigured()) {
      return NextResponse.json(
        { error: "Course search not configured on this server" },
        { status: 503 },
      );
    }
    try {
      const courses = await searchNearby(lat, lng, radius);
      // Warm the cache in the background-ish (awaited, but it's Supabase-local)
      if (courses.length > 0) await upsertCachedCourses(courses);
      return NextResponse.json({ courses, source: "live" });
    } catch (err) {
      const e = err as { status?: number; message?: string };
      return NextResponse.json(
        { error: e.message ?? "Live search failed" },
        { status: e.status ?? 500 },
      );
    }
  }

  // Name branch — cache only (to conserve API budget)
  if (q) {
    const courses = await searchCachedCourses(q, 15);
    return NextResponse.json({ courses, source: "cache" });
  }

  return NextResponse.json({ error: "Provide q, or lat+lng" }, { status: 400 });
}
