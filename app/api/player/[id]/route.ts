import { NextResponse } from "next/server";
import { getPlayer, submitPlayer, updatePlayerScores } from "@/lib/store";

export const dynamic = "force-dynamic";

/** GET /api/player/:id — fetch a player's current state (for resume). */
export async function GET(_req: Request, ctx: RouteContext<"/api/player/[id]">) {
  const { id } = await ctx.params;
  const player = await getPlayer(id);
  if (!player) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ player });
}

/** PATCH /api/player/:id — update scores array or submit as final. */
export async function PATCH(req: Request, ctx: RouteContext<"/api/player/[id]">) {
  const { id } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { scores, submit } = (body ?? {}) as {
    scores?: unknown;
    submit?: boolean;
  };

  if (scores !== undefined) {
    if (!Array.isArray(scores) || scores.length !== 18) {
      return NextResponse.json({ error: "scores must be length 18" }, { status: 400 });
    }
    const cleaned = scores.map((s) => {
      if (s == null) return null;
      const n = Number(s);
      if (!Number.isFinite(n) || n <= 0 || n > 20) return null;
      return Math.round(n);
    });
    const updated = await updatePlayerScores(id, cleaned);
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!submit) return NextResponse.json({ player: updated });
  }

  if (submit) {
    const submitted = await submitPlayer(id);
    if (!submitted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ player: submitted });
  }

  return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
}
