/**
 * GolfAPI.uk wrapper (via RapidAPI).
 *
 * This module is SERVER-SIDE ONLY. It reads the API key from `GOLFAPI_UK_KEY`
 * and must never be imported into a client component.
 *
 * All calls should go through this module so rate limits, caching, and error
 * handling live in one place.
 *
 * NOTE on response shape: the exact JSON shape returned by RapidAPI is verified
 * on the first real call. If your responses don't match these interfaces, tweak
 * the `normaliseClub` function below — the rest of the code uses the normalised
 * shape so callers won't care.
 */

export interface NormalisedTee {
  id: string;
  label: string;
  gender: "M" | "L" | "U";
  par: number[];
  strokeIndex: number[];
  yardage?: number[];
  totalPar: number;
}

export interface NormalisedCourse {
  id: string;          // GolfAPI.uk club id (we flatten club → course for MVP)
  name: string;        // club name (+ course name appended if multi-course club)
  county?: string;
  lat?: number;
  lng?: number;
  holeCount: number;
  tees: NormalisedTee[];
}

export interface GolfApiError {
  status: number;
  message: string;
}

const BASE_URL = "https://uk-golf-course-api.p.rapidapi.com";
const RAPIDAPI_HOST = "uk-golf-course-api.p.rapidapi.com";

function getApiKey(): string | null {
  return process.env.GOLFAPI_UK_KEY ?? null;
}

export function isConfigured(): boolean {
  return !!getApiKey();
}

async function callApi<T>(path: string): Promise<T> {
  const key = getApiKey();
  if (!key) {
    throw { status: 503, message: "GolfAPI.uk not configured" } satisfies GolfApiError;
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "x-rapidapi-key": key,
      "x-rapidapi-host": RAPIDAPI_HOST,
    },
    // Cache briefly to avoid accidental bursts during development
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    throw {
      status: res.status,
      message: `GolfAPI.uk returned ${res.status}`,
    } satisfies GolfApiError;
  }
  return res.json() as Promise<T>;
}

// ---------- Normalisation --------------------------------------------------

/**
 * Accepts a raw club object from GolfAPI.uk and produces the shape our app uses.
 * Tolerates missing fields; returns null if there's nothing scorable.
 */
export function normaliseClub(raw: unknown): NormalisedCourse | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const id = String(r.id ?? r.club_id ?? r.clubId ?? "");
  const name = String(r.name ?? r.club_name ?? r.clubName ?? "");
  if (!id || !name) return null;

  const county = typeof r.county === "string" ? r.county : undefined;
  const lat = typeof r.lat === "number" ? r.lat : typeof r.latitude === "number" ? r.latitude : undefined;
  const lng = typeof r.lng === "number" ? r.lng : typeof r.longitude === "number" ? r.longitude : undefined;

  // Tees might live under various keys: `tees`, `tee_sets`, `teeSets`
  const rawTees =
    (r.tees as unknown[] | undefined) ??
    (r.tee_sets as unknown[] | undefined) ??
    (r.teeSets as unknown[] | undefined) ??
    [];

  const tees: NormalisedTee[] = [];
  for (const raw of rawTees) {
    if (!raw || typeof raw !== "object") continue;
    const t = raw as Record<string, unknown>;
    const par = asNumberArray(t.par);
    const si = asNumberArray(t.strokeIndex ?? t.stroke_index ?? t.si);
    if (par.length === 0 || si.length === 0 || par.length !== si.length) continue;

    const teeLabel =
      typeof t.label === "string"
        ? t.label
        : typeof t.name === "string"
          ? t.name
          : typeof t.colour === "string"
            ? t.colour
            : typeof t.color === "string"
              ? t.color
              : "Tee";

    const gender = typeof t.gender === "string" ? normaliseGender(t.gender) : "U";

    tees.push({
      id: String(t.id ?? `${id}-${teeLabel}`).toLowerCase().replace(/\s+/g, "-"),
      label: teeLabel,
      gender,
      par,
      strokeIndex: si,
      yardage: asNumberArray(t.yardage ?? t.distance),
      totalPar: par.reduce((a, b) => a + b, 0),
    });
  }

  if (tees.length === 0) return null;

  const holeCount = tees[0].par.length;

  return {
    id,
    name,
    county,
    lat,
    lng,
    holeCount,
    tees,
  };
}

function asNumberArray(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === "number" ? x : typeof x === "string" ? Number(x) : NaN))
    .filter((x) => Number.isFinite(x));
}

function normaliseGender(g: string): "M" | "L" | "U" {
  const s = g.trim().toLowerCase();
  if (s === "m" || s.startsWith("male") || s.startsWith("men")) return "M";
  if (s === "l" || s === "f" || s.startsWith("lad") || s.startsWith("fem") || s.startsWith("wom")) return "L";
  return "U";
}

// ---------- Public API -----------------------------------------------------

/**
 * Search for clubs near a lat/lng within `radiusKm` kilometres.
 * Returns an array (possibly empty). Throws GolfApiError on HTTP failure.
 */
export async function searchNearby(
  lat: number,
  lng: number,
  radiusKm = 25,
): Promise<NormalisedCourse[]> {
  const data = await callApi<unknown>(
    `/clubs/nearby?lat=${lat}&lng=${lng}&radius=${radiusKm}`,
  );
  const items = Array.isArray(data) ? data : Array.isArray((data as { clubs?: unknown[] })?.clubs) ? (data as { clubs: unknown[] }).clubs : [];
  const clubs: NormalisedCourse[] = [];
  for (const raw of items) {
    const club = normaliseClub(raw);
    if (club) clubs.push(club);
  }
  return clubs;
}

/**
 * Fetch a single club by id. Returns null if not found.
 */
export async function getClub(clubId: string): Promise<NormalisedCourse | null> {
  try {
    const data = await callApi<unknown>(`/clubs/${encodeURIComponent(clubId)}`);
    return normaliseClub(data);
  } catch (err) {
    if ((err as GolfApiError).status === 404) return null;
    throw err;
  }
}
