"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  cachePendingScores,
  clearPendingScores,
  getPlayerId,
  readPendingScores,
} from "@/lib/client-storage";
import { COURSE, getTee, type TeeId } from "@/lib/course";
import {
  holesPlayed,
  pointsForHole,
  totalPoints,
} from "@/lib/stableford";
import type { Player } from "@/lib/types";

type SyncStatus = "idle" | "saving" | "saved" | "offline";

export default function PlayPage() {
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Current hole index (0-based). Derived from scores: first empty hole, unless user navigates.
  const [holeIdx, setHoleIdx] = useState(0);
  const [scores, setScores] = useState<(number | null)[]>(() => new Array(18).fill(null));
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Load player on mount */
  useEffect(() => {
    const id = getPlayerId();
    if (!id) {
      router.replace("/setup");
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/player/${id}`, { cache: "no-store" });
        if (!res.ok) {
          setError("We couldn't find your round. Start over.");
          setLoading(false);
          return;
        }
        const data = await res.json();
        const p: Player = data.player;
        if (p.submittedAt) {
          router.replace("/done");
          return;
        }
        // Merge server scores with any offline-cached scores (offline wins where non-null and server is null)
        const pending = readPendingScores();
        const merged = p.scores.map((s, i) => {
          if (s != null) return s;
          return pending?.[i] ?? null;
        });
        setPlayer(p);
        setScores(merged);
        // First empty hole
        const firstEmpty = merged.findIndex((s) => s == null);
        setHoleIdx(firstEmpty === -1 ? 17 : firstEmpty);
        setLoading(false);
      } catch {
        setError("Network error while loading your round.");
        setLoading(false);
      }
    })();
  }, [router]);

  const saveToServer = useCallback(
    async (next: (number | null)[], id: string) => {
      setSyncStatus("saving");
      cachePendingScores(next);
      try {
        const res = await fetch(`/api/player/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scores: next }),
        });
        if (!res.ok) {
          setSyncStatus("offline");
          return;
        }
        setSyncStatus("saved");
        clearPendingScores();
      } catch {
        setSyncStatus("offline");
      }
    },
    [],
  );

  /* Debounced auto-save whenever scores change */
  useEffect(() => {
    if (!player) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      saveToServer(scores, player.id);
    }, 400);
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [scores, player, saveToServer]);

  if (loading) {
    return <main className="flex-1 flex items-center justify-center">Loading…</main>;
  }
  if (error || !player) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-red-600">{error ?? "Something went wrong"}</p>
        <button
          className="underline"
          onClick={() => {
            localStorage.clear();
            router.replace("/");
          }}
        >
          Start over
        </button>
      </main>
    );
  }

  const tee = getTee(player.teeId as TeeId);
  const par = tee.par[holeIdx];
  const si = tee.strokeIndex[holeIdx];
  const holeName = COURSE.holeNames[holeIdx];
  const gross = scores[holeIdx];
  const displayScore = gross ?? par; // default stepper starting point
  const holePts = pointsForHole(gross, par, si, player.handicap);
  const total = totalPoints(scores, tee.par, tee.strokeIndex, player.handicap);
  const playedCount = holesPlayed(scores);

  function setHoleScore(value: number | null) {
    setScores((prev) => {
      const next = [...prev];
      next[holeIdx] = value;
      return next;
    });
  }

  function adjust(delta: number) {
    const base = gross ?? par;
    const nextVal = Math.max(1, Math.min(20, base + delta));
    setHoleScore(nextVal);
  }

  function confirmAndAdvance() {
    if (gross == null) setHoleScore(par);
    if (holeIdx < 17) {
      setHoleIdx(holeIdx + 1);
    } else {
      router.push("/review");
    }
  }

  const labelForNet = (() => {
    if (gross == null) return null;
    if (holePts === 0) return "No points";
    if (holePts === 1) return "Net bogey";
    if (holePts === 2) return "Net par";
    if (holePts === 3) return "Net birdie";
    if (holePts === 4) return "Net eagle";
    return "Net albatross";
  })();

  return (
    <main className="flex-1 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-emerald-700 text-white shadow">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[10px] uppercase opacity-70 tracking-wider">Scoring for</p>
            <p className="text-lg font-bold leading-tight">{player.name}</p>
            <p className="text-[11px] opacity-80">
              HCP {player.handicap} · {tee.label.split(" ")[0]} tees
              {player.scorerName && ` · by ${player.scorerName}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-80">Total</p>
            <p className="text-2xl font-bold leading-none">{total}</p>
            <p className="text-[11px] opacity-80">{playedCount}/18 holes</p>
          </div>
        </div>
        <div className="flex text-[11px] px-4 pb-2 opacity-90">
          <span className="flex-1">
            {syncStatus === "saving" && "Saving…"}
            {syncStatus === "saved" && "Saved ✓"}
            {syncStatus === "offline" && "Offline — will retry"}
            {syncStatus === "idle" && "\u00A0"}
          </span>
          <span>Auto-saves after each hole</span>
        </div>
      </div>

      {/* Hole body */}
      <div className="flex-1 px-6 py-6 flex flex-col items-center gap-6">
        <div className="text-center">
          <p className="text-sm uppercase text-gray-500">Hole {holeIdx + 1} of 18</p>
          <h2 className="text-2xl font-bold">{holeName}</h2>
          <p className="text-sm text-gray-600">
            Par {par} · Stroke Index {si}
          </p>
        </div>

        <div className="flex items-center gap-6">
          <button
            type="button"
            aria-label="Decrease"
            onClick={() => adjust(-1)}
            className="w-16 h-16 rounded-full bg-gray-100 text-3xl font-bold active:scale-95"
          >
            –
          </button>
          <div className="w-24 text-center">
            <p className="text-xs text-gray-500">Strokes</p>
            <p className="text-6xl font-bold tabular-nums">{displayScore}</p>
          </div>
          <button
            type="button"
            aria-label="Increase"
            onClick={() => adjust(+1)}
            className="w-16 h-16 rounded-full bg-gray-100 text-3xl font-bold active:scale-95"
          >
            +
          </button>
        </div>

        <div className="h-6 text-sm text-emerald-700 font-semibold">
          {gross != null && (
            <span>
              {holePts} pt{holePts === 1 ? "" : "s"}
              {labelForNet && ` · ${labelForNet}`}
            </span>
          )}
        </div>

        <div className="flex gap-3 flex-wrap justify-center">
          {[par - 1, par, par + 1, par + 2].filter((v) => v > 0).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setHoleScore(v)}
              className={`w-12 h-12 rounded-full border text-lg font-semibold ${
                gross === v
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white border-gray-300 text-gray-700"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Footer nav */}
      <div className="sticky bottom-0 bg-white border-t px-4 py-3 flex gap-3">
        <button
          type="button"
          onClick={() => setHoleIdx(Math.max(0, holeIdx - 1))}
          disabled={holeIdx === 0}
          className="flex-1 py-3 rounded-xl bg-gray-100 font-semibold disabled:opacity-40"
        >
          Back
        </button>
        <button
          type="button"
          onClick={confirmAndAdvance}
          className="flex-[2] py-3 rounded-xl bg-emerald-600 text-white font-semibold active:scale-[.98]"
        >
          {holeIdx < 17 ? "Next hole" : "Review"}
        </button>
      </div>
    </main>
  );
}
