import { redis, KEYS } from "./redis";
import type { Player, RoundConfig } from "./types";
import type { TeeId } from "./course";

/* ------------------------------------------------------------------ */
/* Round config                                                        */
/* ------------------------------------------------------------------ */

export async function getRoundConfig(): Promise<RoundConfig> {
  const raw = await redis.get<RoundConfig>(KEYS.round);
  if (raw) return raw;
  const fresh: RoundConfig = { status: "open", createdAt: Date.now() };
  await redis.set(KEYS.round, fresh);
  return fresh;
}

export async function closeRound(): Promise<RoundConfig> {
  const cfg = await getRoundConfig();
  const updated: RoundConfig = { ...cfg, status: "closed", closedAt: Date.now() };
  await redis.set(KEYS.round, updated);
  return updated;
}

export async function reopenRound(): Promise<RoundConfig> {
  const cfg = await getRoundConfig();
  const updated: RoundConfig = { ...cfg, status: "open", closedAt: undefined };
  await redis.set(KEYS.round, updated);
  return updated;
}

/* ------------------------------------------------------------------ */
/* Players                                                             */
/* ------------------------------------------------------------------ */

export async function createPlayer(params: {
  id: string;
  name: string;
  handicap: number;
  teeId: TeeId;
  prediction: string;
}): Promise<Player> {
  const now = Date.now();
  const player: Player = {
    id: params.id,
    name: params.name,
    handicap: params.handicap,
    teeId: params.teeId,
    prediction: params.prediction,
    scores: new Array(18).fill(null),
    createdAt: now,
    updatedAt: now,
  };
  await redis.set(KEYS.player(player.id), player);
  await redis.sadd(KEYS.playerSet, player.id);
  return player;
}

export async function getPlayer(id: string): Promise<Player | null> {
  return (await redis.get<Player>(KEYS.player(id))) ?? null;
}

export async function updatePlayerScores(
  id: string,
  scores: (number | null)[],
): Promise<Player | null> {
  const current = await getPlayer(id);
  if (!current) return null;
  if (current.submittedAt) return current; // locked after final submit
  const updated: Player = { ...current, scores, updatedAt: Date.now() };
  await redis.set(KEYS.player(id), updated);
  return updated;
}

export async function submitPlayer(id: string): Promise<Player | null> {
  const current = await getPlayer(id);
  if (!current) return null;
  if (current.submittedAt) return current;
  const updated: Player = { ...current, submittedAt: Date.now(), updatedAt: Date.now() };
  await redis.set(KEYS.player(id), updated);
  return updated;
}

/** Admin: overwrite any field on a player. */
export async function adminUpdatePlayer(
  id: string,
  patch: Partial<Omit<Player, "id" | "createdAt">>,
): Promise<Player | null> {
  const current = await getPlayer(id);
  if (!current) return null;
  const updated: Player = { ...current, ...patch, updatedAt: Date.now() };
  await redis.set(KEYS.player(id), updated);
  return updated;
}

export async function deletePlayer(id: string): Promise<void> {
  await redis.del(KEYS.player(id));
  await redis.srem(KEYS.playerSet, id);
}

export async function listPlayers(): Promise<Player[]> {
  const ids = await redis.smembers(KEYS.playerSet);
  if (!ids || ids.length === 0) return [];
  const players = await Promise.all(ids.map((id) => getPlayer(id)));
  return players.filter((p): p is Player => !!p);
}
