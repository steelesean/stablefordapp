"use client";

import { useEffect, useState } from "react";

interface LeaderboardEntry {
  name: string;
  totalPoints: number;
  holesPlayed: number;
  rank: number;
  playerId: string;
}

interface Props {
  joinCode: string;
  currentPlayerId: string | null;
}

export default function Leaderboard({ joinCode, currentPlayerId }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchLeaderboard() {
      try {
        const res = await fetch(`/api/join/${encodeURIComponent(joinCode)}/leaderboard`, {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        setEnabled(data.enabled);
        setEntries(data.leaderboard ?? []);
        setLoaded(true);
      } catch {
        // Silently fail — leaderboard is non-critical
      }
    }

    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [joinCode]);

  if (!loaded || !enabled || entries.length === 0) return null;

  return (
    <div className="px-6 pb-4">
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 text-sm font-semibold"
        >
          <span>Leaderboard</span>
          <span className="text-gray-400 dark:text-gray-500 text-xs">
            {expanded ? "▲" : "▼"}
          </span>
        </button>

        {/* Table */}
        {expanded && (
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="py-1 px-2 text-left w-8">#</th>
                <th className="py-1 px-1 text-left">Player</th>
                <th className="py-1 px-1 text-center">Holes</th>
                <th className="py-1 px-2 text-right">Pts</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const isMe = e.playerId === currentPlayerId;
                return (
                  <tr
                    key={e.playerId}
                    className={`border-b border-gray-100 dark:border-gray-800 ${
                      isMe ? "bg-emerald-50 dark:bg-emerald-950" : ""
                    }`}
                  >
                    <td className="py-1.5 px-2 text-gray-500 dark:text-gray-400">
                      {e.rank}
                    </td>
                    <td className="py-1.5 px-1">
                      {e.name}
                      {isMe && (
                        <span className="ml-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          YOU
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-1 text-center text-gray-500 dark:text-gray-400">
                      {e.holesPlayed}
                    </td>
                    <td className="py-1.5 px-2 text-right font-semibold">{e.totalPoints}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
