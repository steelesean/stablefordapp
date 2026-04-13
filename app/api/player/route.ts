import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import {
  createPlayer,
  createPlayerForCompetition,
  getCompetition,
  getRoundConfig,
} from "@/lib/store";
import { TEE_IDS, type TeeId } from "@/lib/course";

export const dynamic = "force-dynamic";

/** POST /api/player — create a new player for a round or competition. */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { name, scorerName, handicap, teeId, prediction, competitionId } = (body ?? {}) as Record<
    string,
    unknown
  >;

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Player name is required" }, { status: 400 });
  }
  if (typeof scorerName !== "string" || !scorerName.trim()) {
    return NextResponse.json({ error: "Scorer name is required" }, { status: 400 });
  }
  const hcpNum = typeof handicap === "number" ? handicap : parseFloat(String(handicap ?? ""));
  if (!Number.isFinite(hcpNum) || hcpNum < 0 || hcpNum > 54) {
    return NextResponse.json({ error: "Handicap must be between 0 and 54" }, { status: 400 });
  }
  if (typeof teeId !== "string" || !teeId.trim()) {
    return NextResponse.json({ error: "Invalid tee" }, { status: 400 });
  }
  const cleanPrediction = typeof prediction === "string" ? prediction.trim().slice(0, 80) : "";

  // Multi-tenant: create player for a specific competition
  if (typeof competitionId === "string" && competitionId) {
    const competition = await getCompetition(competitionId);
    if (!competition) {
      return NextResponse.json({ error: "Competition not found" }, { status: 404 });
    }
    if (competition.status === "closed") {
      return NextResponse.json({ error: "Competition is closed" }, { status: 403 });
    }
    // Validate teeId against competition tees
    const validTeeIds = competition.tees.map((t) => t.id);
    if (!validTeeIds.includes(teeId)) {
      return NextResponse.json({ error: "Invalid tee for this competition" }, { status: 400 });
    }

    const player = await createPlayerForCompetition(competitionId, {
      id: nanoid(10),
      name: name.trim().slice(0, 60),
      scorerName: scorerName.trim().slice(0, 60),
      handicap: hcpNum,
      teeId,
      prediction: cleanPrediction,
    });
    return NextResponse.json({ player });
  }

  // Legacy single-round mode
  if (!(TEE_IDS as readonly string[]).includes(teeId)) {
    return NextResponse.json({ error: "Invalid tee" }, { status: 400 });
  }

  const cfg = await getRoundConfig();
  if (cfg.status === "closed") {
    return NextResponse.json({ error: "Round is closed" }, { status: 403 });
  }

  const player = await createPlayer({
    id: nanoid(10),
    name: name.trim().slice(0, 60),
    scorerName: scorerName.trim().slice(0, 60),
    handicap: hcpNum,
    teeId: teeId as TeeId,
    prediction: cleanPrediction,
  });
  return NextResponse.json({ player });
}
