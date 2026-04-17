import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase-auth";
import {
  closeCompetition,
  CourseEditLockedError,
  deleteCompetition,
  deletePlayer,
  getCompetition,
  adminUpdatePlayer,
  reopenCompetition,
  resetCompetition,
  updateCompetitionCourse,
  updateCompetitionLeaderboard,
} from "@/lib/store";
import type { CompetitionTee } from "@/lib/types";

export const dynamic = "force-dynamic";

/** POST /api/competitions/[id]/admin — admin actions on a competition. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const competition = await getCompetition(id);
  if (!competition || competition.organizerId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action, playerId, patch, showLeaderboard, coursePatch } = (body ?? {}) as {
    action?: string;
    playerId?: string;
    patch?: Record<string, unknown>;
    showLeaderboard?: boolean;
    coursePatch?: {
      courseName?: unknown;
      holeNames?: unknown;
      tees?: unknown;
    };
  };

  switch (action) {
    case "close": {
      const comp = await closeCompetition(id);
      return NextResponse.json({ competition: comp });
    }
    case "reopen": {
      const comp = await reopenCompetition(id);
      return NextResponse.json({ competition: comp });
    }
    case "reset": {
      await resetCompetition(id);
      return NextResponse.json({ ok: true });
    }
    case "deletePlayer": {
      if (!playerId) return NextResponse.json({ error: "playerId required" }, { status: 400 });
      await deletePlayer(playerId);
      return NextResponse.json({ ok: true });
    }
    case "updateSettings": {
      const comp = await updateCompetitionLeaderboard(id, !!showLeaderboard);
      return NextResponse.json({ competition: comp });
    }
    case "updateCourse": {
      if (!coursePatch) {
        return NextResponse.json({ error: "coursePatch required" }, { status: 400 });
      }
      const validationError = validateCoursePatch(coursePatch);
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }
      const holeCount = competition.holeCount;
      const safePatch = {
        courseName: String(coursePatch.courseName).trim().slice(0, 100),
        holeNames: (coursePatch.holeNames as string[])
          .slice(0, holeCount)
          .map((n) => String(n ?? "").trim().slice(0, 40)),
        tees: (coursePatch.tees as CompetitionTee[]).map((t) => ({
          id: String(t.id).trim().toLowerCase().replace(/\s+/g, "-"),
          label: String(t.label).trim().slice(0, 60),
          par: t.par.map((n) => Number(n)),
          strokeIndex: t.strokeIndex.map((n) => Number(n)),
          totalPar: t.par.reduce((a, v) => a + Number(v), 0),
        })),
      };
      try {
        const comp = await updateCompetitionCourse(id, safePatch);
        return NextResponse.json({ competition: comp });
      } catch (err) {
        if (err instanceof CourseEditLockedError) {
          return NextResponse.json(
            { error: err.message, code: "locked" },
            { status: 409 },
          );
        }
        throw err;
      }
    }
    case "deleteCompetition": {
      await deleteCompetition(id);
      return NextResponse.json({ ok: true, deleted: true });
    }
    case "update": {
      if (!playerId || !patch) {
        return NextResponse.json({ error: "playerId and patch required" }, { status: 400 });
      }
      const updated = await adminUpdatePlayer(playerId, patch);
      if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ player: updated });
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}

// ---- helpers ---------------------------------------------------------------

function validateCoursePatch(patch: {
  courseName?: unknown;
  holeNames?: unknown;
  tees?: unknown;
}): string | null {
  if (typeof patch.courseName !== "string" || !patch.courseName.trim()) {
    return "courseName is required";
  }
  if (!Array.isArray(patch.holeNames)) {
    return "holeNames must be an array";
  }
  if (!Array.isArray(patch.tees) || patch.tees.length === 0) {
    return "tees must be a non-empty array";
  }
  for (const t of patch.tees as CompetitionTee[]) {
    if (!t || typeof t.label !== "string" || !t.label.trim()) {
      return "every tee needs a label";
    }
    if (!Array.isArray(t.par) || !Array.isArray(t.strokeIndex)) {
      return "tee par and strokeIndex must be arrays";
    }
    if (t.par.length !== t.strokeIndex.length) {
      return "tee par and strokeIndex lengths must match";
    }
    if (t.par.some((p) => !Number.isFinite(Number(p)) || Number(p) < 1 || Number(p) > 7)) {
      return "tee par values must be 1–7";
    }
    const sis = t.strokeIndex.map((s) => Number(s));
    const teeHoleCount = sis.length;
    if (sis.some((s) => !Number.isFinite(s) || s < 1 || s > teeHoleCount)) {
      return `stroke index values must be 1–${teeHoleCount}`;
    }
    if (new Set(sis).size !== teeHoleCount) {
      return "each stroke index must be used exactly once";
    }
  }
  return null;
}
