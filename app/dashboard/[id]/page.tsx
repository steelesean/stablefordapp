import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/supabase-auth";
import { getCompetition, listPlayersForCompetition } from "@/lib/store";
import CompetitionDashboard from "./CompetitionDashboard";

export const dynamic = "force-dynamic";

export default async function CompetitionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const competition = await getCompetition(id);
  if (!competition || competition.organizerId !== user.id) {
    notFound();
  }

  const players = await listPlayersForCompetition(id);

  return (
    <CompetitionDashboard
      competition={competition}
      initialPlayers={players}
    />
  );
}
