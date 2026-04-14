import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase-auth";
import {
  closeCompetition,
  deleteCompetition,
  deletePlayer,
  getCompetition,
  adminUpdatePlayer,
  reopenCompetition,
  resetCompetition,
  updateCompetitionLeaderboard,
} from "@/lib/store";

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

  const { action, playerId, patch, showLeaderboard } = (body ?? {}) as {
    action?: string;
    playerId?: string;
    patch?: Record<string, unknown>;
    showLeaderboard?: boolean;
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
