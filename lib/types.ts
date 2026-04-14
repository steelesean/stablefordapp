import type { Tee, TeeId } from "./course";

export type RoundStatus = "open" | "closed";

export interface RoundConfig {
  status: RoundStatus;
  createdAt: number;
  closedAt?: number;
}

export interface Player {
  id: string;
  /** The player being scored. */
  name: string;
  /** The playing partner who is entering the scores on their phone. */
  scorerName: string;
  handicap: number;
  teeId: TeeId;
  prediction: string;
  /** 18-element array; null means the hole hasn't been entered yet. */
  scores: (number | null)[];
  createdAt: number;
  updatedAt: number;
  /** Present once the player has confirmed their round as final. */
  submittedAt?: number;
  /** FK to competition (multi-tenant). Absent in legacy single-round mode. */
  competitionId?: string;
}

/* ------------------------------------------------------------------ */
/* Multi-tenant types (Phase 1+)                                       */
/* ------------------------------------------------------------------ */

/** A tee configuration as stored in the competitions.tees JSONB column. */
export interface CompetitionTee {
  id: string;
  label: string;
  par: number[];          // length = holeCount
  strokeIndex: number[];  // length = holeCount
  totalPar: number;
}

/**
 * A competition created by an organizer. Replaces the hardcoded COURSE
 * constant and the single-row round_config table.
 */
export interface Competition {
  id: string;
  organizerId: string;
  name: string;
  joinCode: string;
  courseName: string;
  holeCount: number;
  holeNames: string[];
  tees: CompetitionTee[];
  status: RoundStatus;
  showLeaderboard: boolean;
  createdAt: number;
  closedAt?: number;
}
