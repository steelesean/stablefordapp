/**
 * Deer Park Golf & Country Club, Livingston, West Lothian.
 * Data transcribed from the scorecard (Parsaver Ltd).
 *
 * Par and stroke index are identical across the Black / White / Yellow tees
 * (men's card, par 72). The Red tees (ladies' card, par 73) differ on a few
 * holes — see the per-tee data below.
 *
 * Source of truth for scoring. Do not edit without updating stableford tests.
 */

export type TeeId = "white" | "yellow" | "black" | "red";

export interface Tee {
  id: TeeId;
  label: string;
  par: readonly number[];          // length 18
  strokeIndex: readonly number[];  // length 18
  totalPar: number;
}

export interface Course {
  name: string;
  holeNames: readonly string[];
  tees: Record<TeeId, Tee>;
}

// Holes 1-9 then 10-18
const HOLE_NAMES = [
  "Royal Stag",
  "Stables",
  "Muir Trap",
  "Long Park",
  "Jim's Ain",
  "Deer's Run",
  "Fawns",
  "Antlers",
  "The Monastery",
  "The Hind",
  "Slaps & Stiles",
  "Pines",
  "Buck & Doe",
  "The Law",
  "Deer Hill",
  "Ca Canny",
  "The Rut",
  "Knightsridge",
] as const;

// Men's tees (White/Yellow/Black): par 72, same SI across all three
const MENS_PAR = [4, 5, 3, 4, 4, 4, 3, 5, 4, 3, 4, 5, 4, 5, 4, 3, 4, 4] as const;
const MENS_SI  = [15, 5, 9, 1, 7, 3, 11, 13, 17, 14, 2, 16, 18, 4, 12, 10, 6, 8] as const;

// Red tees (ladies): par 74, different SI
const RED_PAR  = [4, 5, 3, 5, 4, 4, 3, 5, 4, 3, 4, 5, 4, 5, 4, 3, 5, 4] as const;
const RED_SI   = [14, 4, 16, 12, 6, 2, 18, 8, 10, 15, 5, 3, 11, 1, 7, 13, 17, 9] as const;

const sum = (arr: readonly number[]) => arr.reduce((a, b) => a + b, 0);

export const COURSE: Course = {
  name: "Deer Park Golf & Country Club",
  holeNames: HOLE_NAMES,
  tees: {
    white: {
      id: "white",
      label: "White (Men's Medal)",
      par: MENS_PAR,
      strokeIndex: MENS_SI,
      totalPar: sum(MENS_PAR),
    },
    yellow: {
      id: "yellow",
      label: "Yellow (Men's Forward)",
      par: MENS_PAR,
      strokeIndex: MENS_SI,
      totalPar: sum(MENS_PAR),
    },
    black: {
      id: "black",
      label: "Black (Championship)",
      par: MENS_PAR,
      strokeIndex: MENS_SI,
      totalPar: sum(MENS_PAR),
    },
    red: {
      id: "red",
      label: "Red (Ladies')",
      par: RED_PAR,
      strokeIndex: RED_SI,
      totalPar: sum(RED_PAR),
    },
  },
};

export const TEE_IDS: readonly TeeId[] = ["white", "yellow", "black", "red"];

export function getTee(teeId: TeeId): Tee {
  return COURSE.tees[teeId];
}
