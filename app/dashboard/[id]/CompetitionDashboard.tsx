"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { holesPlayed } from "@/lib/stableford";
import { rankPlayers } from "@/lib/ranking";
import type { Competition, Player } from "@/lib/types";

interface Props {
  competition: Competition;
  initialPlayers: Player[];
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m ago`;
}

export default function CompetitionDashboard({ competition, initialPlayers }: Props) {
  const router = useRouter();
  const [comp, setComp] = useState(competition);
  const [players, setPlayers] = useState(initialPlayers);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const joinUrl = typeof window !== "undefined"
    ? `${window.location.origin}/c/${comp.joinCode}`
    : `/c/${comp.joinCode}`;

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/competitions/${comp.id}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setComp(data.competition);
      setPlayers(data.players);
    } catch {
      /* ignore poll errors */
    }
  }, [comp.id]);

  useEffect(() => {
    const t = setInterval(refresh, 10000);
    return () => clearInterval(t);
  }, [refresh]);

  async function post(body: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/competitions/${comp.id}/admin`, {
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

  const ranked = useMemo(() => rankPlayers(players, comp.tees), [players, comp.tees]);

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
    const lines = [`${comp.courseName} — Stableford results`];
    ranked.forEach((p) => {
      const suffix = p.submittedAt ? "" : ` (${p.played}/18)`;
      const scorer = p.scorerName ? ` [scored by ${p.scorerName}]` : "";
      lines.push(`${p.rank}. ${p.name} — ${p.total} pts${suffix}${scorer}`);
    });
    return lines.join("\n");
  }, [ranked, comp.courseName]);

  const [copied, setCopied] = useState<string | null>(null);

  function copyText(text: string, label?: string) {
    const key = label ?? text;
    // Try modern clipboard API first, fall back to execCommand
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(
        () => { setCopied(key); setTimeout(() => setCopied(null), 2000); },
        () => fallbackCopy(text, key),
      );
    } else {
      fallbackCopy(text, key);
    }
  }

  function fallbackCopy(text: string, key: string) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch { /* ignore */ }
    document.body.removeChild(ta);
  }

  async function handleDeleteCompetition() {
    if (
      !confirm("Delete this competition? All players and scores will be permanently removed.") ||
      !confirm("Are you absolutely sure? This cannot be undone.")
    ) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/competitions/${comp.id}/admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteCompetition" }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Failed to delete");
        setBusy(false);
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Network error");
      setBusy(false);
    }
  }

  return (
    <main className="flex-1 px-4 py-6 max-w-3xl mx-auto w-full space-y-6">
      <Link href="/dashboard" className="text-sm text-emerald-700 dark:text-emerald-400 hover:underline">
        &larr; All competitions
      </Link>

      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{comp.name || "Competition"}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{comp.courseName}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-xs font-semibold px-2 py-1 rounded-full ${
              comp.status === "open"
                ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            {comp.status === "open" ? "Open" : "Closed"}
          </span>
          {comp.status === "open" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (confirm("Close the competition? Players won't be able to join after this.")) {
                  post({ action: "close" });
                }
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white font-semibold"
            >
              Close
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
            className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 font-semibold"
          >
            Refresh
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (
                confirm("Reset the competition? This will DELETE all players and scores.") &&
                confirm("Are you absolutely sure? This cannot be undone.")
              ) {
                post({ action: "reset" });
              }
            }}
            className="text-xs px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 font-semibold"
          >
            Reset
          </button>
        </div>
      </header>

      {/* Share panel */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
        <h2 className="font-semibold text-sm">Share with players</h2>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm break-all">
            {joinUrl}
          </code>
          <button
            type="button"
            onClick={() => copyText(joinUrl, "link")}
            className="text-xs px-3 py-2 rounded-lg bg-emerald-600 text-white font-semibold shrink-0"
          >
            {copied === "link" ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Join code: <strong>{comp.joinCode}</strong>
        </p>
        <label className="flex items-center gap-2 text-sm pt-1 cursor-pointer">
          <input
            type="checkbox"
            checked={comp.showLeaderboard}
            onChange={() =>
              post({ action: "updateSettings", showLeaderboard: !comp.showLeaderboard })
            }
            className="rounded border-gray-300 dark:border-gray-600"
          />
          Show live leaderboard to players
        </label>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <p className="text-sm text-gray-600 dark:text-gray-400">
        {players.length} player{players.length === 1 ? "" : "s"} joined · {submittedCount} submitted
        {allSubmitted && " · all in!"}
      </p>

      {/* Results table */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">
            {comp.status === "closed" ? "Final results" : "Live standings"}
          </h2>
          <button
            type="button"
            onClick={() => copyText(resultsText, "results")}
            className="text-xs text-emerald-700 dark:text-emerald-400 underline"
          >
            {copied === "results" ? "Copied!" : "Copy as text"}
          </button>
        </div>
        {ranked.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No players yet.</p>
        ) : (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm tabular-nums">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-left">
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
                  <tr key={p.id} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="py-2 px-2 text-gray-500 dark:text-gray-400 align-top">{p.rank}</td>
                    <td className="py-2 px-1 align-top">
                      <div className="font-medium leading-tight">{p.name}</div>
                      {p.scorerName && (
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                          scored by {p.scorerName}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-1 text-center align-top">{p.handicap}</td>
                    <td className="py-2 px-1 text-center align-top">{p.played}/{comp.holeCount}</td>
                    <td className="py-2 px-2 text-right font-bold align-top">{p.total}</td>
                    <td className="py-2 px-2 text-right text-xs text-gray-500 dark:text-gray-400 align-top">
                      {p.submittedAt ? (
                        <span className="text-emerald-700 dark:text-emerald-400">submitted</span>
                      ) : (
                        timeAgo(p.updatedAt)
                      )}
                      <button
                        type="button"
                        className="ml-2 text-red-600 dark:text-red-400 underline"
                        onClick={() => {
                          if (confirm(`Delete ${p.name}?`)) {
                            post({ action: "deletePlayer", playerId: p.id });
                          }
                        }}
                      >
                        &times;
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
        <h2 className="font-semibold">Predicted winner votes</h2>
        {predictions.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No predictions yet.</p>
        ) : (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm tabular-nums">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-left">
                <tr>
                  <th className="py-2 px-2">Player</th>
                  <th className="py-2 px-2 text-right">Votes</th>
                  <th className="py-2 px-2 text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map((p) => (
                  <tr key={p.name} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="py-2 px-2 font-medium">{p.name}</td>
                    <td className="py-2 px-2 text-right">{p.count}</td>
                    <td className="py-2 px-2 text-right text-gray-500 dark:text-gray-400">
                      {totalPredictions ? Math.round((p.count / totalPredictions) * 100) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-gray-400 dark:text-gray-500">
        Auto-refreshes every 10 seconds.
      </p>

      <hr className="border-gray-200 dark:border-gray-700" />

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Permanently delete this competition and all its data.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={handleDeleteCompetition}
          className="text-xs px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 font-semibold"
        >
          Delete competition
        </button>
      </div>
    </main>
  );
}
