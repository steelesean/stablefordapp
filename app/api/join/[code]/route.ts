import { NextResponse } from "next/server";
import { getCompetitionByCode } from "@/lib/store";

export const dynamic = "force-dynamic";

/** GET /api/join/[code] — resolve a join code to competition data. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const competition = await getCompetitionByCode(code);

  if (!competition) {
    return NextResponse.json({ error: "Competition not found" }, { status: 404 });
  }

  // Return only the data players need (no organizer ID)
  return NextResponse.json({
    competition: {
      id: competition.id,
      name: competition.name,
      joinCode: competition.joinCode,
      courseName: competition.courseName,
      holeCount: competition.holeCount,
      holeNames: competition.holeNames,
      tees: competition.tees,
      status: competition.status,
      showLeaderboard: competition.showLeaderboard,
    },
  });
}
