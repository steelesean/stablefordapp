/**
 * Pure stableford scoring logic. No IO, no side effects.
 *
 * Stableford points (per hole):
 *   - Net eagle or better (par - 2 or fewer) = 4+ pts
 *   - Net birdie (par - 1)                   = 3 pts
 *   - Net par                                = 2 pts
 *   - Net bogey (par + 1)                    = 1 pt
 *   - Net double bogey or worse              = 0 pts
 *   - Hole not played (no score)             = 0 pts
 *
 * Handicap strokes received per hole:
 *   strokes(hcp, si) = floor(hcp / 18) + (si <= hcp mod 18 ? 1 : 0)
 * e.g. hcp 28 gets 2 strokes on SI 1–10, 1 stroke on SI 11–18.
 */

export type Scores = readonly (number | null)[];

/** Strokes received on a hole given a whole-number handicap and that hole's stroke index (1..18). */
export function strokesOnHole(handicap: number, strokeIndex: number): number {
  if (!Number.isFinite(handicap) || handicap < 0) return 0;
  const h = Math.floor(handicap);
  const base = Math.floor(h / 18);
  const extra = strokeIndex <= h % 18 ? 1 : 0;
  return base + extra;
}

/** Stableford points for a single hole. Returns 0 if score is missing. */
export function pointsForHole(
  gross: number | null | undefined,
  par: number,
  strokeIndex: number,
  handicap: number,
): number {
  if (gross == null || !Number.isFinite(gross) || gross <= 0) return 0;
  const strokes = strokesOnHole(handicap, strokeIndex);
  const net = gross - strokes;
  const pts = par - net + 2;
  return pts > 0 ? pts : 0;
}

export interface HoleBreakdown {
  hole: number;          // 1..18
  par: number;
  strokeIndex: number;
  gross: number | null;
  strokesReceived: number;
  net: number | null;
  points: number;
}

/** Per-hole breakdown for display and for the admin view. */
export function breakdown(
  scores: Scores,
  pars: readonly number[],
  strokeIndexes: readonly number[],
  handicap: number,
): HoleBreakdown[] {
  if (pars.length !== 18 || strokeIndexes.length !== 18) {
    throw new Error("Course must have exactly 18 holes");
  }
  return pars.map((par, i) => {
    const si = strokeIndexes[i];
    const gross = scores[i] ?? null;
    const strokesReceived = strokesOnHole(handicap, si);
    const net = gross == null ? null : gross - strokesReceived;
    const points = pointsForHole(gross, par, si, handicap);
    return { hole: i + 1, par, strokeIndex: si, gross, strokesReceived, net, points };
  });
}

/** Total stableford points across a full (or partial) round. */
export function totalPoints(
  scores: Scores,
  pars: readonly number[],
  strokeIndexes: readonly number[],
  handicap: number,
): number {
  return breakdown(scores, pars, strokeIndexes, handicap).reduce(
    (acc, h) => acc + h.points,
    0,
  );
}

/** Number of holes with a recorded gross score. */
export function holesPlayed(scores: Scores): number {
  return scores.reduce((acc: number, s) => (s != null && s > 0 ? acc + 1 : acc), 0);
}

/**
 * Countback for ties in stableford: higher points on the back 9,
 * then back 6, then back 3, then the final hole.
 * Returns an array of [total, back9, back6, back3, last] used for lexicographic sort.
 */
export function countback(
  scores: Scores,
  pars: readonly number[],
  strokeIndexes: readonly number[],
  handicap: number,
): [number, number, number, number, number] {
  const perHole = breakdown(scores, pars, strokeIndexes, handicap).map((h) => h.points);
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const total = sum(perHole);
  const back9 = sum(perHole.slice(9));       // holes 10–18
  const back6 = sum(perHole.slice(12));      // holes 13–18
  const back3 = sum(perHole.slice(15));      // holes 16–18
  const last = perHole[17] ?? 0;
  return [total, back9, back6, back3, last];
}
