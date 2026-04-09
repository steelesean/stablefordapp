/**
 * Client-only helpers for localStorage so we can resume rounds on reopen
 * and queue score writes when the network is flaky.
 */

export const LS_KEY_PLAYER_ID = "stableford:playerId";
export const LS_KEY_PENDING = "stableford:pendingScores";

export function getPlayerId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LS_KEY_PLAYER_ID);
}

export function setPlayerId(id: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_KEY_PLAYER_ID, id);
}

export function clearPlayerId(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LS_KEY_PLAYER_ID);
}

/** Save the most recent scores snapshot locally as an offline fallback. */
export function cachePendingScores(scores: (number | null)[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_KEY_PENDING, JSON.stringify(scores));
}

export function readPendingScores(): (number | null)[] | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(LS_KEY_PENDING);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== 18) return null;
    return parsed.map((s) => (typeof s === "number" ? s : null));
  } catch {
    return null;
  }
}

export function clearPendingScores(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LS_KEY_PENDING);
}
