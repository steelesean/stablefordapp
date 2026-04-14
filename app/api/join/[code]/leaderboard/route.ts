import { NextResponse } from "next/server";
import { getCompetitionByCode, listPlayersForCompetition } from "@/lib/store";
import { rankPlayers, toLeaderboard } from "@/lib/ranking";

export const dynamic = "force-dynamic";

/** GET /api/join/[code]/leaderboard — public top-5 leaderboard. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const competition = await getCompetitionByCode(code);

  if (!competition) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!competition.showLeaderboard) {
    return NextResponse.json({ enabled: false, leaderboard: [] });
  }

  const players = await listPlayersForCompetition(competition.id);
  const ranked = rankPlayers(players, competition.tees);
  const leaderboard = toLeaderboard(ranked, 5);

  return NextResponse.json({ enabled: true, leaderboard });
}
