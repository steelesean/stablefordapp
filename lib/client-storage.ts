/**
 * Client-only helpers for localStorage so we can resume rounds on reopen
 * and queue score writes when the network is flaky.
 *
 * Keys are scoped by join code when provided (multi-tenant mode).
 * Legacy unscoped keys are supported for backward compatibility.
 */

/* ------------------------------------------------------------------ */
/* Key helpers                                                         */
/* ------------------------------------------------------------------ */

function playerIdKey(joinCode?: string): string {
  return joinCode ? `stableford:${joinCode}:playerId` : "stableford:playerId";
}

function pendingKey(joinCode?: string): string {
  return joinCode ? `stableford:${joinCode}:pendingScores` : "stableford:pendingScores";
}

/* ------------------------------------------------------------------ */
/* Player ID                                                           */
/* ------------------------------------------------------------------ */

export function getPlayerId(joinCode?: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(playerIdKey(joinCode));
}

export function setPlayerId(id: string, joinCode?: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(playerIdKey(joinCode), id);
}

export function clearPlayerId(joinCode?: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(playerIdKey(joinCode));
}

/* ------------------------------------------------------------------ */
/* Pending scores (offline fallback)                                   */
/* ------------------------------------------------------------------ */

/** Save the most recent scores snapshot locally as an offline fallback. */
export function cachePendingScores(scores: (number | null)[], joinCode?: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(pendingKey(joinCode), JSON.stringify(scores));
}

export function readPendingScores(joinCode?: string): (number | null)[] | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(pendingKey(joinCode));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== 18) return null;
    return parsed.map((s) => (typeof s === "number" ? s : null));
  } catch {
    return null;
  }
}

export function clearPendingScores(joinCode?: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(pendingKey(joinCode));
}

/* ------------------------------------------------------------------ */
/* Onboarding (organiser, not scoped by competition)                   */
/* ------------------------------------------------------------------ */

const ONBOARDING_KEY = "stableford:onboardingSeen";

export function hasSeenOnboarding(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(ONBOARDING_KEY) === "true";
}

export function setOnboardingSeen(seen: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ONBOARDING_KEY, seen ? "true" : "false");
}

/* ------------------------------------------------------------------ */
/* Legacy exports (deprecated — use with joinCode parameter instead)   */
/* ------------------------------------------------------------------ */

export const LS_KEY_PLAYER_ID = "stableford:playerId";
export const LS_KEY_PENDING = "stableford:pendingScores";
