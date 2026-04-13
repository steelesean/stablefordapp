"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getPlayerId } from "@/lib/client-storage";
import { breakdown, holesPlayed } from "@/lib/stableford";
import type { CompetitionTee, Player } from "@/lib/types";
import { useCompetition } from "../layout";

function findTee(tees: CompetitionTee[], teeId: string): CompetitionTee | null {
  return tees.find((t) => t.id === teeId) ?? null;
}

export default function ReviewPage() {
  const router = useRouter();
  const comp = useCompetition();

  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = getPlayerId(comp.joinCode);
    if (!id) {
      router.replace(`/c/${comp.joinCode}/setup`);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/player/${id}`, { cache: "no-store" });
        if (!res.ok) {
          setError("We couldn't load your round.");
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (data.player.submittedAt) {
          router.replace(`/c/${comp.joinCode}/done`);
          return;
        }
        setPlayer(data.player);
        setLoading(false);
      } catch {
        setError("Network error.");
        setLoading(false);
      }
    })();
  }, [router, comp.joinCode]);

  async function submitFinal() {
    if (!player) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/player/${player.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submit: true }),
      });
      if (!res.ok) {
        setError("Couldn't submit. Try again.");
        setSubmitting(false);
        return;
      }
      router.push(`/c/${comp.joinCode}/done`);
    } catch {
      setError("Network error.");
      setSubmitting(false);
    }
  }

  if (loading) return <main className="flex-1 flex items-center justify-center">Loading…</main>;
  if (error || !player) {
    return (
      <main className="flex-1 flex items-center justify-center px-6 text-center text-red-600 dark:text-red-400">
        {error ?? "Something went wrong"}
      </main>
    );
  }

  const tee = findTee(comp.tees, player.teeId);
  const rows = breakdown(player.scores, tee?.par ?? [], tee?.strokeIndex ?? [], player.handicap);
  const total = rows.reduce((a, r) => a + r.points, 0);
  const played = holesPlayed(player.scores);
  const allPlayed = played === comp.holeCount;

  return (
    <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full">
      <h1 className="text-2xl font-bold">Review {player.name}&apos;s card</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
        HCP {player.handicap} · {tee?.label ?? ""}
        {player.scorerName && ` · scored by ${player.scorerName}`}
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Go through each hole with {player.name} before you submit. Once submitted, only the
        organizer can change it.
      </p>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
        <table className="w-full text-sm tabular-nums">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
            <tr>
              <th className="py-2 px-2 text-left">#</th>
              <th className="py-2 px-1 text-left font-normal">Hole</th>
              <th className="py-2 px-1 text-center">Par</th>
              <th className="py-2 px-1 text-center">Gross</th>
              <th className="py-2 px-2 text-right">Pts</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.hole}
                className={
                  i === 8
                    ? "border-b-2 border-gray-300 dark:border-gray-600"
                    : "border-b border-gray-200 dark:border-gray-700"
                }
              >
                <td className="py-2 px-2 text-gray-500 dark:text-gray-400">{r.hole}</td>
                <td className="py-2 px-1 truncate max-w-[100px]">
                  {comp.holeNames[i] || `Hole ${i + 1}`}
                </td>
                <td className="py-2 px-1 text-center">{r.par}</td>
                <td className="py-2 px-1 text-center">
                  {r.gross ?? <span className="text-red-500 dark:text-red-400">—</span>}
                </td>
                <td className="py-2 px-2 text-right font-semibold">{r.points}</td>
                <td className="py-2 pr-2 text-right">
                  <Link
                    href={`/c/${comp.joinCode}/play`}
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        sessionStorage.setItem("stableford:jumpTo", String(i));
                      }
                    }}
                    className="text-xs text-emerald-700 dark:text-emerald-400 underline"
                  >
                    edit
                  </Link>
                </td>
              </tr>
            ))}
            <tr className="bg-gray-50 dark:bg-gray-800 font-bold">
              <td className="py-3 px-2" colSpan={4}>
                Total ({played}/{comp.holeCount})
              </td>
              <td className="py-3 px-2 text-right text-lg">{total}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      {!allPlayed && (
        <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 rounded-lg px-3 py-2 mb-4">
          {comp.holeCount - played} hole{comp.holeCount - played === 1 ? "" : "s"} with no score.
          Missing holes count as zero points. Go back and fill them in if needed.
        </p>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>}

      <div className="flex gap-3">
        <Link
          href={`/c/${comp.joinCode}/play`}
          className="flex-1 py-4 rounded-xl bg-gray-100 dark:bg-gray-800 text-center font-semibold"
        >
          Back to hole
        </Link>
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="flex-1 py-4 rounded-xl bg-emerald-600 text-white font-semibold active:scale-[.98]"
        >
          Submit final
        </button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-4 z-20">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h2 className="text-lg font-bold">Submit {player.name}&apos;s card?</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You&apos;re about to submit <b>{total} points</b> as {player.name}&apos;s final
              score. Make sure they&apos;ve seen it. Once submitted, only the organizer can change
              it.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitFinal}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Yes, submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
