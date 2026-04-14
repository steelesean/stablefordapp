/**
 * Shared ranking logic used by both the organiser dashboard
 * and the public leaderboard API.
 */

import { countback, holesPlayed, totalPoints } from "./stableford";
import type { CompetitionTee, Player } from "./types";

export interface RankedPlayer extends Player {
  total: number;
  played: number;
  rank: number;
  sortKey: [number, number, number, number, number];
}

export interface LeaderboardEntry {
  name: string;
  totalPoints: number;
  holesPlayed: number;
  rank: number;
  playerId: string;
}

export function findTee(tees: CompetitionTee[], teeId: string): CompetitionTee | null {
  return tees.find((t) => t.id === teeId) ?? null;
}

export function rankPlayers(players: Player[], tees: CompetitionTee[]): RankedPlayer[] {
  const enriched = players.map((p) => {
    const tee = findTee(tees, p.teeId);
    const par = tee?.par ?? [];
    const si = tee?.strokeIndex ?? [];
    const total = totalPoints(p.scores, par, si, p.handicap);
    const played = holesPlayed(p.scores);
    const sortKey = countback(p.scores, par, si, p.handicap);
    return { ...p, total, played, sortKey, rank: 0 };
  });
  enriched.sort((a, b) => {
    for (let i = 0; i < a.sortKey.length; i++) {
      if (b.sortKey[i] !== a.sortKey[i]) return b.sortKey[i] - a.sortKey[i];
    }
    return a.name.localeCompare(b.name);
  });
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

/** Convert ranked players to a lightweight leaderboard (top N). */
export function toLeaderboard(ranked: RankedPlayer[], limit = 5): LeaderboardEntry[] {
  return ranked.slice(0, limit).map((p) => ({
    name: p.name,
    totalPoints: p.total,
    holesPlayed: p.played,
    rank: p.rank,
    playerId: p.id,
  }));
}
