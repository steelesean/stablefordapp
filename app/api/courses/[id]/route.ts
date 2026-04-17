import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase-auth";
import { getCachedCourse, upsertCachedCourses } from "@/lib/course-cache";
import { getClub, isConfigured } from "@/lib/golf-api";

export const dynamic = "force-dynamic";

/**
 * GET /api/courses/[id]
 *
 * Returns the full course shape (all tees) for a given club id.
 * Cache-first: if we have it locally, return straight away. Only hits
 * the live API if not in the cache.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  const cached = await getCachedCourse(id);
  if (cached) {
    return NextResponse.json({ course: cached, source: "cache" });
  }

  if (!isConfigured()) {
    return NextResponse.json(
      { error: "Course not in cache and live API not configured" },
      { status: 404 },
    );
  }

  try {
    const live = await getClub(id);
    if (!live) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    await upsertCachedCourses([live]);
    return NextResponse.json({ course: live, source: "live" });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return NextResponse.json(
      { error: e.message ?? "Fetch failed" },
      { status: e.status ?? 500 },
    );
  }
}
