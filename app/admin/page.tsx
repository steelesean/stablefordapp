import { notFound } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { getRoundConfig, listPlayers } from "@/lib/store";
import AdminDashboard from "./AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage(props: PageProps<"/admin">) {
  const searchParams = await props.searchParams;
  const key = typeof searchParams.key === "string" ? searchParams.key : undefined;
  if (!isAdmin(key)) {
    notFound();
  }
  const [config, players] = await Promise.all([getRoundConfig(), listPlayers()]);
  return (
    <AdminDashboard
      adminKey={key!}
      initialConfig={config}
      initialPlayers={players}
    />
  );
}
