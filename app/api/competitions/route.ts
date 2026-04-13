import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase-auth";
import { createCompetition } from "@/lib/store";
import type { CompetitionTee } from "@/lib/types";

export const dynamic = "force-dynamic";

/** POST /api/competitions — create a new competition. */
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, courseName, holeCount, holeNames, tees } = (body ?? {}) as {
    name?: string;
    courseName?: string;
    holeCount?: number;
    holeNames?: string[];
    tees?: CompetitionTee[];
  };

  if (typeof courseName !== "string" || !courseName.trim()) {
    return NextResponse.json({ error: "Course name is required" }, { status: 400 });
  }
  if (!Array.isArray(tees) || tees.length === 0) {
    return NextResponse.json({ error: "At least one tee is required" }, { status: 400 });
  }

  // Validate each tee
  const holes = holeCount ?? 18;
  for (const tee of tees) {
    if (!tee.label?.trim()) {
      return NextResponse.json({ error: "Each tee needs a label" }, { status: 400 });
    }
    if (!Array.isArray(tee.par) || tee.par.length !== holes) {
      return NextResponse.json(
        { error: `${tee.label}: par array must have ${holes} values` },
        { status: 400 },
      );
    }
    if (!Array.isArray(tee.strokeIndex) || tee.strokeIndex.length !== holes) {
      return NextResponse.json(
        { error: `${tee.label}: strokeIndex array must have ${holes} values` },
        { status: 400 },
      );
    }
  }

  // Compute totalPar for each tee
  const cleanTees: CompetitionTee[] = tees.map((t) => ({
    id: t.id || t.label.trim().toLowerCase().replace(/\s+/g, "-"),
    label: t.label.trim(),
    par: t.par.map(Number),
    strokeIndex: t.strokeIndex.map(Number),
    totalPar: t.par.reduce((a, v) => a + Number(v), 0),
  }));

  try {
    const competition = await createCompetition({
      organizerId: user.id,
      name: (name ?? "").trim().slice(0, 100),
      courseName: courseName.trim().slice(0, 100),
      holeCount: holes,
      holeNames: (holeNames ?? []).map((n) => (n ?? "").trim().slice(0, 40)),
      tees: cleanTees,
    });
    return NextResponse.json({ competition });
  } catch (err) {
    console.error("Failed to create competition:", err);
    return NextResponse.json({ error: "Failed to create competition" }, { status: 500 });
  }
}
