import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { createPlayer, getRoundConfig } from "@/lib/store";
import { TEE_IDS, type TeeId } from "@/lib/course";

export const dynamic = "force-dynamic";

/** POST /api/player — create a new player for the round. */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { name, handicap, teeId, prediction } = (body ?? {}) as Record<string, unknown>;

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const hcpNum = typeof handicap === "number" ? handicap : parseFloat(String(handicap ?? ""));
  if (!Number.isFinite(hcpNum) || hcpNum < 0 || hcpNum > 54) {
    return NextResponse.json({ error: "Handicap must be between 0 and 54" }, { status: 400 });
  }
  if (typeof teeId !== "string" || !(TEE_IDS as readonly string[]).includes(teeId)) {
    return NextResponse.json({ error: "Invalid tee" }, { status: 400 });
  }
  const cleanPrediction = typeof prediction === "string" ? prediction.trim().slice(0, 80) : "";

  const cfg = await getRoundConfig();
  if (cfg.status === "closed") {
    return NextResponse.json({ error: "Round is closed" }, { status: 403 });
  }

  const player = await createPlayer({
    id: nanoid(10),
    name: name.trim().slice(0, 60),
    handicap: hcpNum,
    teeId: teeId as TeeId,
    prediction: cleanPrediction,
  });
  return NextResponse.json({ player });
}
