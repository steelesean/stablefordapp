import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import {
  adminUpdatePlayer,
  closeRound,
  deletePlayer,
  listPlayers,
  reopenRound,
  getRoundConfig,
} from "@/lib/store";

export const dynamic = "force-dynamic";

function authed(req: Request): boolean {
  const key = new URL(req.url).searchParams.get("key");
  return isAdmin(key);
}

/** GET /api/admin?key=... — round config + all players. */
export async function GET(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [config, players] = await Promise.all([getRoundConfig(), listPlayers()]);
  return NextResponse.json({ config, players });
}

/**
 * POST /api/admin?key=...
 * Body: { action: "close" | "reopen" | "delete" | "update", playerId?, patch? }
 */
export async function POST(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { action, playerId, patch } = (body ?? {}) as {
    action?: string;
    playerId?: string;
    patch?: Record<string, unknown>;
  };

  switch (action) {
    case "close": {
      const cfg = await closeRound();
      return NextResponse.json({ config: cfg });
    }
    case "reopen": {
      const cfg = await reopenRound();
      return NextResponse.json({ config: cfg });
    }
    case "delete": {
      if (!playerId) return NextResponse.json({ error: "playerId required" }, { status: 400 });
      await deletePlayer(playerId);
      return NextResponse.json({ ok: true });
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
