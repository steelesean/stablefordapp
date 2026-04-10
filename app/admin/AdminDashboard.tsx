"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { COURSE, getTee, type TeeId } from "@/lib/course";
import { countback, holesPlayed, totalPoints } from "@/lib/stableford";
import type { Player, RoundConfig } from "@/lib/types";

interface Props {
  adminKey: string;
  initialConfig: RoundConfig;
  initialPlayers: Player[];
}

interface Ranked extends Player {
  total: number;
  played: number;
  rank: number;
  sortKey: [number, number, number, number, number];
}

function rankPlayers(players: Player[]): Ranked[] {
  const enriched = players.map((p) => {
    const tee = getTee(p.teeId as TeeId);
    const total = totalPoints(p.scores, tee.par, tee.strokeIndex, p.handicap);
    const played = holesPlayed(p.scores);
    const sortKey = countback(p.scores, tee.par, tee.strokeIndex, p.handicap);
    return { ...p, total, played, sortKey, rank: 0 };
  });
  enriched.sort((a, b) => {
    // Descending by total, back9, back6, back3, last
    for (let i = 0; i < a.sortKey.length; i++) {
      if (b.sortKey[i] !== a.sortKey[i]) return b.sortKey[i] - a.sortKey[i];
    }
    return a.name.localeCompare(b.name);
  });
  // Assign ranks (players tied on countback share a rank)
  let prevKey: string | null = null;
  let prevRank = 0;
  enriched.forEach((p, i) => {
    const k = p.sortKey.join(",");
    if (k === prevKey) p.rank = prevRank;
    else {
      p.rank = i + 1;
      prevRank = p.rank;
      prevKey = k;
    }
  });
  return enriched;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m ago`;
}

export default function AdminDashboard({ adminKey, initialConfig, initialPlayers }: Props) {
  const [config, setConfig] = useState(initialConfig);
  const [players, setPlayers] = useState(initialPlayers);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin?key=${encodeURIComponent(adminKey)}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      setConfig(data.config);
      setPlayers(data.players);
    } catch {
      /* ignore poll errors */
    }
  }, [adminKey]);

  useEffect(() => {
    const t = setInterval(refresh, 10000);
    return () => clearInterval(t);
  }, [refresh]);

  async function post(body: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin?key=${encodeURIComponent(adminKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Request failed");
      }
      await refresh();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  const ranked = useMemo(() => rankPlayers(players), [players]);

  const predictions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of players) {
      const pred = p.prediction.trim();
      if (!pred) continue;
      const key = pred.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const displayName = new Map<string, string>();
    for (const p of players) {
      const pred = p.prediction.trim();
      if (!pred) continue;
      const key = pred.toLowerCase();
      if (!displayName.has(key)) displayName.set(key, pred);
    }
    return Array.from(counts.entries())
      .map(([k, count]) => ({ name: displayName.get(k)!, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [players]);

  const totalPredictions = predictions.reduce((a, p) => a + p.count, 0);
  const submittedCount = players.filter((p) => p.submittedAt).length;
  const allSubmitted = players.length > 0 && submittedCount === players.length;

  const resultsText = useMemo(() => {
    const lines = [`${COURSE.name} — Stableford results`];
    ranked.forEach((p) => {
      const suffix = p.submittedAt ? "" : ` (${p.played}/18)`;
      const scorer = p.scorerName ? ` [scored by ${p.scorerName}]` : "";
      lines.push(`${p.rank}. ${p.name} — ${p.total} pts${suffix}${scorer}`);
    });
    return lines.join("\n");
  }, [ranked]);

  const predictionsText = useMemo(() => {
    const lines = ["Predicted winner votes"];
    predictions.forEach((p) => lines.push(`${p.name} — ${p.count}`));
    return lines.join("\n");
  }, [predictions]);

  function copyText(text: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  }

  return (
    <main className="flex-1 px-4 py-6 max-w-3xl mx-auto w-full space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Organizer dashboard</h1>
          <p className="text-sm text-gray-500">{COURSE.name}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-xs font-semibold px-2 py-1 rounded-full ${
              config.status === "open" ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-700"
            }`}
          >
            {config.status === "open" ? "Round open" : "Round closed"}
          </span>
          {config.status === "open" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (confirm("Close the round? Players won't be able to join after this.")) {
                  post({ action: "close" });
                }
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white font-semibold"
            >
              Close round
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => post({ action: "reopen" })}
              className="text-xs px-3 py-1.5 rounded-lg bg-gray-600 text-white font-semibold"
            >
              Reopen
            </button>
          )}
          <button
            type="button"
            onClick={refresh}
            className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 font-semibold"
          >
            Refresh
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (
                confirm("Reset the entire round? This will DELETE all players and scores.") &&
                confirm("Are you absolutely sure? This cannot be undone.")
              ) {
                post({ action: "reset" });
              }
            }}
            className="text-xs px-3 py-1.5 rounded-lg border border-red-300 text-red-600 font-semibold"
          >
            Reset round
          </button>
        </div>
      </header>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <p className="text-sm text-gray-600">
        {players.length} player{players.length === 1 ? "" : "s"} joined · {submittedCount} submitted
        {allSubmitted && " · all in!"}
      </p>

      {/* Results table */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">
            {config.status === "closed" ? "Final results" : "Live standings"}
          </h2>
          <button
            type="button"
            onClick={() => copyText(resultsText)}
            className="text-xs text-emerald-700 underline"
          >
            Copy as text
          </button>
        </div>
        {ranked.length === 0 ? (
          <p className="text-sm text-gray-500">No players yet.</p>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm tabular-nums">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="py-2 px-2">#</th>
                  <th className="py-2 px-1">Player</th>
                  <th className="py-2 px-1 text-center">HCP</th>
                  <th className="py-2 px-1 text-center">Holes</th>
                  <th className="py-2 px-2 text-right">Pts</th>
                  <th className="py-2 px-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="py-2 px-2 text-gray-500 align-top">{p.rank}</td>
                    <td className="py-2 px-1 align-top">
                      <div className="font-medium leading-tight">{p.name}</div>
                      {p.scorerName && (
                        <div className="text-[11px] text-gray-500 leading-tight">
                          scored by {p.scorerName}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-1 text-center align-top">{p.handicap}</td>
                    <td className="py-2 px-1 text-center align-top">{p.played}/18</td>
                    <td className="py-2 px-2 text-right font-bold align-top">{p.total}</td>
                    <td className="py-2 px-2 text-right text-xs text-gray-500 align-top">
                      {p.submittedAt ? (
                        <span className="text-emerald-700">submitted</span>
                      ) : (
                        timeAgo(p.updatedAt)
                      )}
                      <button
                        type="button"
                        className="ml-2 text-red-600 underline"
                        onClick={() => {
                          if (confirm(`Delete ${p.name}?`)) {
                            post({ action: "delete", playerId: p.id });
                          }
                        }}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Predictions */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Predicted winner votes</h2>
          <button
            type="button"
            onClick={() => copyText(predictionsText)}
            className="text-xs text-emerald-700 underline"
          >
            Copy as text
          </button>
        </div>
        {predictions.length === 0 ? (
          <p className="text-sm text-gray-500">No predictions yet.</p>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm tabular-nums">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="py-2 px-2">Player</th>
                  <th className="py-2 px-2 text-right">Votes</th>
                  <th className="py-2 px-2 text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map((p) => (
                  <tr key={p.name} className="border-t">
                    <td className="py-2 px-2 font-medium">{p.name}</td>
                    <td className="py-2 px-2 text-right">{p.count}</td>
                    <td className="py-2 px-2 text-right text-gray-500">
                      {totalPredictions ? Math.round((p.count / totalPredictions) * 100) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-gray-400">
        Auto-refreshes every 10 seconds. Share <code>/</code> with your players (not this page).
      </p>
    </main>
  );
}
