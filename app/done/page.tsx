"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getPlayerId } from "@/lib/client-storage";
import { getTee, type TeeId } from "@/lib/course";
import { totalPoints } from "@/lib/stableford";
import type { Player } from "@/lib/types";

export default function DonePage() {
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);

  useEffect(() => {
    const id = getPlayerId();
    if (!id) {
      router.replace("/");
      return;
    }
    fetch(`/api/player/${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setPlayer(d.player))
      .catch(() => {});
  }, [router]);

  if (!player) return <main className="flex-1 flex items-center justify-center">Loading…</main>;

  const tee = getTee(player.teeId as TeeId);
  const total = totalPoints(player.scores, tee.par, tee.strokeIndex, player.handicap);

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
      <div className="text-6xl">⛳</div>
      <h1 className="text-2xl font-bold">{player.name}&apos;s card is in</h1>
      <p className="text-gray-600">
        Final score: <span className="font-bold text-emerald-700 text-2xl">{total}</span> points.
      </p>
      {player.scorerName && (
        <p className="text-sm text-gray-500">Scored by {player.scorerName}.</p>
      )}
      <p className="text-sm text-gray-500 max-w-xs">
        Results will be announced once everyone has finished. Good luck!
      </p>
      <p className="text-xs text-gray-400">
        Spotted a mistake? Message the organizer — they can edit the card.
      </p>
    </main>
  );
}
