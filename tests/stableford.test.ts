import { describe, it, expect } from "vitest";
import {
  strokesOnHole,
  pointsForHole,
  breakdown,
  totalPoints,
  holesPlayed,
  countback,
} from "@/lib/stableford";

// Deer Park white tees for sanity (par 72)
const PAR = [4, 5, 3, 4, 4, 4, 3, 5, 4, 3, 4, 5, 4, 5, 4, 3, 4, 4] as const;
const SI  = [15, 5, 9, 1, 7, 3, 11, 13, 17, 14, 2, 16, 18, 4, 12, 10, 6, 8] as const;

describe("strokesOnHole", () => {
  it("scratch player gets no strokes", () => {
    for (let si = 1; si <= 18; si++) expect(strokesOnHole(0, si)).toBe(0);
  });

  it("handicap 18 gets exactly 1 stroke on every hole", () => {
    for (let si = 1; si <= 18; si++) expect(strokesOnHole(18, si)).toBe(1);
  });

  it("handicap 10 gets 1 stroke on SI 1-10 only", () => {
    for (let si = 1; si <= 10; si++) expect(strokesOnHole(10, si)).toBe(1);
    for (let si = 11; si <= 18; si++) expect(strokesOnHole(10, si)).toBe(0);
  });

  it("handicap 28 gets 2 strokes on SI 1-10, 1 stroke on SI 11-18", () => {
    for (let si = 1; si <= 10; si++) expect(strokesOnHole(28, si)).toBe(2);
    for (let si = 11; si <= 18; si++) expect(strokesOnHole(28, si)).toBe(1);
  });

  it("handicap 36 gets 2 strokes on every hole", () => {
    for (let si = 1; si <= 18; si++) expect(strokesOnHole(36, si)).toBe(2);
  });

  it("fractional handicap is floored", () => {
    // 17.9 → handicap 17: gets 1 stroke on SI 1-17, none on SI 18
    expect(strokesOnHole(17.9, 1)).toBe(1);
    expect(strokesOnHole(17.9, 18)).toBe(0);
    // 18.4 → handicap 18: 1 stroke on every hole
    expect(strokesOnHole(18.4, 1)).toBe(1);
    expect(strokesOnHole(18.4, 18)).toBe(1);
  });

  it("negative or NaN handicap returns 0", () => {
    expect(strokesOnHole(-1, 1)).toBe(0);
    expect(strokesOnHole(NaN, 1)).toBe(0);
  });
});

describe("pointsForHole", () => {
  // par 4 hole, SI 1, scratch player
  it("net eagle = 4 points", () => expect(pointsForHole(2, 4, 1, 0)).toBe(4));
  it("net birdie = 3 points", () => expect(pointsForHole(3, 4, 1, 0)).toBe(3));
  it("net par = 2 points", () => expect(pointsForHole(4, 4, 1, 0)).toBe(2));
  it("net bogey = 1 point", () => expect(pointsForHole(5, 4, 1, 0)).toBe(1));
  it("net double bogey = 0 points", () => expect(pointsForHole(6, 4, 1, 0)).toBe(0));
  it("net triple bogey = 0 points (clamped)", () => expect(pointsForHole(7, 4, 1, 0)).toBe(0));

  it("net albatross on par 5 = 5 points", () => expect(pointsForHole(2, 5, 1, 0)).toBe(5));

  it("hcp 18 bogey on any hole = 2 points (net par)", () => {
    expect(pointsForHole(5, 4, 1, 18)).toBe(2);
    expect(pointsForHole(5, 4, 18, 18)).toBe(2);
  });

  it("hcp 28 double bogey on SI 1 = 2 points (gets 2 strokes → net par)", () => {
    expect(pointsForHole(6, 4, 1, 28)).toBe(2);
  });

  it("hcp 28 double bogey on SI 18 = 1 point (gets 1 stroke → net bogey)", () => {
    expect(pointsForHole(6, 4, 18, 28)).toBe(1);
  });

  it("missing score = 0 points", () => {
    expect(pointsForHole(null, 4, 1, 10)).toBe(0);
    expect(pointsForHole(undefined, 4, 1, 10)).toBe(0);
    expect(pointsForHole(0, 4, 1, 10)).toBe(0);
  });
});

describe("breakdown / totalPoints", () => {
  it("scratch player shooting par on every hole scores 36 points", () => {
    const scores = PAR.slice() as number[];
    expect(totalPoints(scores, PAR, SI, 0)).toBe(36);
  });

  it("handicap 18 shooting bogey on every hole scores 36 points", () => {
    const scores = PAR.map((p) => p + 1);
    expect(totalPoints(scores, PAR, SI, 18)).toBe(36);
  });

  it("handicap 10 shooting par on every hole scores 46 points (2 + 10 strokes back on SI 1-10)", () => {
    // 8 pars on SI 11-18 = 16 pts. 10 pars on SI 1-10 play net birdie = 30 pts. Total 46.
    const scores = PAR.slice() as number[];
    expect(totalPoints(scores, PAR, SI, 10)).toBe(46);
  });

  it("blank scores contribute zero", () => {
    const scores: (number | null)[] = new Array(18).fill(null);
    scores[0] = 4;
    expect(totalPoints(scores, PAR, SI, 0)).toBe(2);
  });

  it("holesPlayed counts only recorded gross scores", () => {
    const scores: (number | null)[] = new Array(18).fill(null);
    scores[0] = 4; scores[5] = 5; scores[17] = 3;
    expect(holesPlayed(scores)).toBe(3);
  });

  it("breakdown returns 18 rows with correct structure", () => {
    const scores = PAR.slice() as number[];
    const rows = breakdown(scores, PAR, SI, 0);
    expect(rows).toHaveLength(18);
    expect(rows[0]).toMatchObject({ hole: 1, par: 4, strokeIndex: 15, gross: 4, points: 2 });
  });
});

describe("countback", () => {
  it("back 9 tiebreak works", () => {
    const front: number[] = [4, 5, 3, 4, 4, 4, 3, 5, 4]; // 9 pars = 18 pts scratch
    const backA: number[] = [3, 4, 5, 4, 5, 4, 3, 4, 4]; // 9 pars = 18 pts scratch (36 total)
    const backB: number[] = [3, 4, 5, 4, 5, 4, 3, 4, 3]; // last hole birdie → 19 pts back 9

    const a = countback([...front, ...backA], PAR, SI, 0);
    const b = countback([...front, ...backB], PAR, SI, 0);
    // Same total... actually b has more points
    expect(a[0]).toBe(36);
    expect(b[0]).toBe(37);
    expect(b[1]).toBeGreaterThan(a[1]);
  });

  it("last-hole tiebreak: same back-9 and back-6 but different last hole", () => {
    // Construct two identical back 9s except for hole 18 score vs par.
    // Both players par holes 1-17; player A bogeys 18 (par 4), player B pars 18.
    const base = PAR.slice() as number[];
    const a = [...base]; a[17] = PAR[17] + 1; // bogey 18
    const b = [...base]; // par 18
    const cA = countback(a, PAR, SI, 0);
    const cB = countback(b, PAR, SI, 0);
    expect(cB[0] - cA[0]).toBe(1);
    expect(cB[4] - cA[4]).toBe(1);
  });
});
