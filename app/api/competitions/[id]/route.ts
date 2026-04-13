import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase-auth";
import { getCompetition, listPlayersForCompetition } from "@/lib/store";

export const dynamic = "force-dynamic";

/** GET /api/competitions/[id] — get competition + players for polling. */
export async function GET(
  _req: Request,
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

  const players = await listPlayersForCompetition(id);
  return NextResponse.json({ competition, players });
}
