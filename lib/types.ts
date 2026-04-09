import type { TeeId } from "./course";

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
}
