import { getSupabase, supabaseConfigured } from "./supabase";
import type { Competition, CompetitionTee, Player, RoundConfig } from "./types";
import type { TeeId } from "./course";
import { generateJoinCode } from "./join-code";

/* ------------------------------------------------------------------ */
/* Types that match the Postgres schema exactly                        */
/* ------------------------------------------------------------------ */

interface DbRoundConfigRow {
  id: number;
  status: "open" | "closed";
  created_at: string;
  closed_at: string | null;
}

interface DbPlayerRow {
  id: string;
  name: string;
  scorer_name: string;
  handicap: number;
  tee_id: TeeId;
  prediction: string;
  scores: (number | null)[];
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  competition_id: string | null;
}

interface DbCompetitionRow {
  id: string;
  organizer_id: string;
  name: string;
  join_code: string;
  course_name: string;
  hole_count: number;
  hole_names: string[];
  tees: CompetitionTee[];
  status: "open" | "closed";
  created_at: string;
  closed_at: string | null;
}

const ROUND_ID = 1; // single-round app — one row in round_config

function rowToPlayer(row: DbPlayerRow): Player {
  return {
    id: row.id,
    name: row.name,
    scorerName: row.scorer_name ?? "",
    handicap: Number(row.handicap),
    teeId: row.tee_id,
    prediction: row.prediction,
    scores: row.scores,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    submittedAt: row.submitted_at ? new Date(row.submitted_at).getTime() : undefined,
    competitionId: row.competition_id ?? undefined,
  };
}

function rowToCompetition(row: DbCompetitionRow): Competition {
  return {
    id: row.id,
    organizerId: row.organizer_id,
    name: row.name,
    joinCode: row.join_code,
    courseName: row.course_name,
    holeCount: row.hole_count,
    holeNames: row.hole_names,
    tees: row.tees,
    status: row.status,
    createdAt: new Date(row.created_at).getTime(),
    closedAt: row.closed_at ? new Date(row.closed_at).getTime() : undefined,
  };
}

function rowToConfig(row: DbRoundConfigRow): RoundConfig {
  return {
    status: row.status,
    createdAt: new Date(row.created_at).getTime(),
    closedAt: row.closed_at ? new Date(row.closed_at).getTime() : undefined,
  };
}

/* ------------------------------------------------------------------ */
/* In-memory fallback (local dev only, no persistence)                 */
/* ------------------------------------------------------------------ */

interface MemStore {
  config: RoundConfig;
  players: Map<string, Player>;
}

/**
 * In production, Supabase MUST be configured — throw immediately so a
 * misconfigured deploy surfaces as a clear 500 instead of silently
 * losing data in memory.
 *
 * In local dev (`NODE_ENV !== 'production'`), fall back to an in-memory
 * store so `npm run dev` works without env vars.
 */
function requireSupabase(): void {
  if (!supabaseConfigured() && process.env.NODE_ENV === "production") {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel env vars and redeploy.",
    );
  }
}

function useMemFallback(): boolean {
  return !supabaseConfigured() && process.env.NODE_ENV !== "production";
}

const g = globalThis as unknown as { __stablefordMem?: MemStore };
function mem(): MemStore {
  if (!g.__stablefordMem) {
    g.__stablefordMem = {
      config: { status: "open", createdAt: Date.now() },
      players: new Map(),
    };
    console.warn(
      "[store] Using in-memory fallback — no persistence. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for production.",
    );
  }
  return g.__stablefordMem;
}

/* ------------------------------------------------------------------ */
/* Round config                                                        */
/* ------------------------------------------------------------------ */

export async function getRoundConfig(): Promise<RoundConfig> {
  requireSupabase();
  if (useMemFallback()) return mem().config;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("round_config")
    .select("*")
    .eq("id", ROUND_ID)
    .maybeSingle<DbRoundConfigRow>();
  if (error) throw error;
  if (data) return rowToConfig(data);

  // Seed the single row on first use
  const { data: inserted, error: insertErr } = await supabase
    .from("round_config")
    .insert({ id: ROUND_ID, status: "open" })
    .select()
    .single<DbRoundConfigRow>();
  if (insertErr) throw insertErr;
  return rowToConfig(inserted);
}

export async function closeRound(): Promise<RoundConfig> {
  requireSupabase();
  if (useMemFallback()) {
    const m = mem();
    m.config = { ...m.config, status: "closed", closedAt: Date.now() };
    return m.config;
  }
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("round_config")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", ROUND_ID)
    .select()
    .single<DbRoundConfigRow>();
  if (error) throw error;
  return rowToConfig(data);
}

export async function reopenRound(): Promise<RoundConfig> {
  requireSupabase();
  if (useMemFallback()) {
    const m = mem();
    m.config = { ...m.config, status: "open", closedAt: undefined };
    return m.config;
  }
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("round_config")
    .update({ status: "open", closed_at: null })
    .eq("id", ROUND_ID)
    .select()
    .single<DbRoundConfigRow>();
  if (error) throw error;
  return rowToConfig(data);
}

/* ------------------------------------------------------------------ */
/* Players                                                             */
/* ------------------------------------------------------------------ */

export async function createPlayer(params: {
  id: string;
  name: string;
  scorerName: string;
  handicap: number;
  teeId: TeeId;
  prediction: string;
}): Promise<Player> {
  requireSupabase();
  if (useMemFallback()) {
    const now = Date.now();
    const player: Player = {
      id: params.id,
      name: params.name,
      scorerName: params.scorerName,
      handicap: params.handicap,
      teeId: params.teeId,
      prediction: params.prediction,
      scores: new Array(18).fill(null),
      createdAt: now,
      updatedAt: now,
    };
    mem().players.set(player.id, player);
    return player;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("players")
    .insert({
      id: params.id,
      name: params.name,
      scorer_name: params.scorerName,
      handicap: params.handicap,
      tee_id: params.teeId,
      prediction: params.prediction,
      scores: new Array(18).fill(null),
    })
    .select()
    .single<DbPlayerRow>();
  if (error) throw error;
  return rowToPlayer(data);
}

export async function getPlayer(id: string): Promise<Player | null> {
  requireSupabase();
  if (useMemFallback()) return mem().players.get(id) ?? null;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("id", id)
    .maybeSingle<DbPlayerRow>();
  if (error) throw error;
  return data ? rowToPlayer(data) : null;
}

export async function updatePlayerScores(
  id: string,
  scores: (number | null)[],
): Promise<Player | null> {
  requireSupabase();
  if (useMemFallback()) {
    const current = mem().players.get(id);
    if (!current) return null;
    if (current.submittedAt) return current;
    const updated: Player = { ...current, scores, updatedAt: Date.now() };
    mem().players.set(id, updated);
    return updated;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("players")
    .update({ scores, updated_at: new Date().toISOString() })
    .eq("id", id)
    .is("submitted_at", null) // locked after final submit
    .select()
    .maybeSingle<DbPlayerRow>();
  if (error) throw error;
  if (data) return rowToPlayer(data);
  // Either not found or already submitted — return current state for caller
  return getPlayer(id);
}

export async function submitPlayer(id: string): Promise<Player | null> {
  requireSupabase();
  if (useMemFallback()) {
    const current = mem().players.get(id);
    if (!current) return null;
    if (current.submittedAt) return current;
    const updated: Player = {
      ...current,
      submittedAt: Date.now(),
      updatedAt: Date.now(),
    };
    mem().players.set(id, updated);
    return updated;
  }

  const supabase = getSupabase();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("players")
    .update({ submitted_at: nowIso, updated_at: nowIso })
    .eq("id", id)
    .is("submitted_at", null)
    .select()
    .maybeSingle<DbPlayerRow>();
  if (error) throw error;
  if (data) return rowToPlayer(data);
  return getPlayer(id);
}

/** Admin: overwrite arbitrary fields on a player. */
export async function adminUpdatePlayer(
  id: string,
  patch: Partial<Omit<Player, "id" | "createdAt">>,
): Promise<Player | null> {
  requireSupabase();
  if (useMemFallback()) {
    const current = mem().players.get(id);
    if (!current) return null;
    const updated: Player = { ...current, ...patch, updatedAt: Date.now() };
    mem().players.set(id, updated);
    return updated;
  }

  const supabase = getSupabase();
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.scorerName !== undefined) row.scorer_name = patch.scorerName;
  if (patch.handicap !== undefined) row.handicap = patch.handicap;
  if (patch.teeId !== undefined) row.tee_id = patch.teeId;
  if (patch.prediction !== undefined) row.prediction = patch.prediction;
  if (patch.scores !== undefined) row.scores = patch.scores;
  if (patch.submittedAt !== undefined) {
    row.submitted_at = patch.submittedAt ? new Date(patch.submittedAt).toISOString() : null;
  }

  const { data, error } = await supabase
    .from("players")
    .update(row)
    .eq("id", id)
    .select()
    .maybeSingle<DbPlayerRow>();
  if (error) throw error;
  return data ? rowToPlayer(data) : null;
}

export async function deletePlayer(id: string): Promise<void> {
  requireSupabase();
  if (useMemFallback()) {
    mem().players.delete(id);
    return;
  }
  const supabase = getSupabase();
  const { error } = await supabase.from("players").delete().eq("id", id);
  if (error) throw error;
}

export async function resetRound(): Promise<RoundConfig> {
  requireSupabase();
  if (useMemFallback()) {
    const m = mem();
    m.players.clear();
    m.config = { status: "open", createdAt: Date.now() };
    return m.config;
  }

  const supabase = getSupabase();
  // Delete all players
  const { error: delErr } = await supabase.from("players").delete().neq("id", "");
  if (delErr) throw delErr;
  // Reset round config to open
  const { data, error } = await supabase
    .from("round_config")
    .update({ status: "open", closed_at: null })
    .eq("id", ROUND_ID)
    .select()
    .single<DbRoundConfigRow>();
  if (error) throw error;
  return rowToConfig(data);
}

export async function listPlayers(): Promise<Player[]> {
  requireSupabase();
  if (useMemFallback()) return Array.from(mem().players.values());

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => rowToPlayer(row as DbPlayerRow));
}

/* ------------------------------------------------------------------ */
/* Competitions (multi-tenant)                                         */
/* ------------------------------------------------------------------ */

export async function createCompetition(params: {
  organizerId: string;
  name: string;
  courseName: string;
  holeCount: number;
  holeNames: string[];
  tees: CompetitionTee[];
}): Promise<Competition> {
  requireSupabase();
  const supabase = getSupabase();

  // Generate a unique join code (retry on collision — extremely unlikely)
  let joinCode: string;
  let attempts = 0;
  do {
    joinCode = generateJoinCode();
    const { data: existing } = await supabase
      .from("competitions")
      .select("id")
      .eq("join_code", joinCode)
      .maybeSingle();
    if (!existing) break;
    attempts++;
  } while (attempts < 5);

  const { data, error } = await supabase
    .from("competitions")
    .insert({
      organizer_id: params.organizerId,
      name: params.name,
      join_code: joinCode,
      course_name: params.courseName,
      hole_count: params.holeCount,
      hole_names: params.holeNames,
      tees: params.tees,
    })
    .select()
    .single<DbCompetitionRow>();
  if (error) throw error;
  return rowToCompetition(data);
}

export async function getCompetition(id: string): Promise<Competition | null> {
  requireSupabase();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("competitions")
    .select("*")
    .eq("id", id)
    .maybeSingle<DbCompetitionRow>();
  if (error) throw error;
  return data ? rowToCompetition(data) : null;
}

export async function getCompetitionByCode(joinCode: string): Promise<Competition | null> {
  requireSupabase();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("competitions")
    .select("*")
    .eq("join_code", joinCode.toUpperCase())
    .maybeSingle<DbCompetitionRow>();
  if (error) throw error;
  return data ? rowToCompetition(data) : null;
}

export async function listCompetitions(organizerId: string): Promise<Competition[]> {
  requireSupabase();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("competitions")
    .select("*")
    .eq("organizer_id", organizerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => rowToCompetition(row as DbCompetitionRow));
}

export async function closeCompetition(id: string): Promise<Competition> {
  requireSupabase();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("competitions")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single<DbCompetitionRow>();
  if (error) throw error;
  return rowToCompetition(data);
}

export async function reopenCompetition(id: string): Promise<Competition> {
  requireSupabase();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("competitions")
    .update({ status: "open", closed_at: null })
    .eq("id", id)
    .select()
    .single<DbCompetitionRow>();
  if (error) throw error;
  return rowToCompetition(data);
}

export async function resetCompetition(id: string): Promise<void> {
  requireSupabase();
  const supabase = getSupabase();
  // Delete all players for this competition
  const { error: delErr } = await supabase
    .from("players")
    .delete()
    .eq("competition_id", id);
  if (delErr) throw delErr;
  // Reopen the competition
  const { error } = await supabase
    .from("competitions")
    .update({ status: "open", closed_at: null })
    .eq("id", id);
  if (error) throw error;
}

export async function listPlayersForCompetition(competitionId: string): Promise<Player[]> {
  requireSupabase();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("competition_id", competitionId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => rowToPlayer(row as DbPlayerRow));
}

export async function createPlayerForCompetition(
  competitionId: string,
  params: {
    id: string;
    name: string;
    scorerName: string;
    handicap: number;
    teeId: string;
    prediction: string;
  },
): Promise<Player> {
  requireSupabase();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("players")
    .insert({
      id: params.id,
      competition_id: competitionId,
      name: params.name,
      scorer_name: params.scorerName,
      handicap: params.handicap,
      tee_id: params.teeId,
      prediction: params.prediction,
      scores: new Array(18).fill(null),
    })
    .select()
    .single<DbPlayerRow>();
  if (error) throw error;
  return rowToPlayer(data);
}
