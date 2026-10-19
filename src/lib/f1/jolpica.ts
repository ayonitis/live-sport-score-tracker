import "server-only";

import type {
  F1ConstructorStanding,
  F1Driver,
  F1DriverStanding,
  F1QualifyingRow,
  F1Race,
  F1RaceResultRow,
  F1Session,
  F1SessionKey,
  F1Team,
} from "@/lib/f1/types";

/**
 * Jolpica-F1 (the Ergast-compatible successor API). Free, no API key.
 * Data licence: CC BY-NC-SA 4.0 (non-commercial). Unauthenticated limit: 4 requests/second, 500/hour.
 * This module is the only place that knows the provider's URL layout and field names, so the provider can be swapped.
 */
const BASE_URL = (process.env.F1_API_BASE_URL?.trim() || "https://api.jolpi.ca/ergast/f1").replace(/\/+$/, "");
const REQUEST_TIMEOUT_MS = 10_000;

export type F1ProviderErrorCode = "rate_limited" | "http_error" | "invalid_response" | "network";

export class F1ProviderError extends Error {
  code: F1ProviderErrorCode;

  constructor(code: F1ProviderErrorCode, message: string) {
    super(message);
    this.name = "F1ProviderError";
    this.code = code;
  }
}

type Json = Record<string, unknown>;

function asObject(value: unknown): Json | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Json) : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function asNumber(value: unknown): number | null {
  const text = asString(value);
  if (text === null) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

async function jolpicaGet(path: string, revalidateSeconds: number): Promise<Json> {
  const url = `${BASE_URL}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: revalidateSeconds },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new F1ProviderError("network", "The F1 data source could not be reached.");
  }

  if (response.status === 429) {
    throw new F1ProviderError("rate_limited", "The F1 data source is rate limiting requests. Try again in a minute.");
  }

  if (!response.ok) {
    throw new F1ProviderError("http_error", `The F1 data source returned an error (${response.status}).`);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new F1ProviderError("invalid_response", "The F1 data source returned an unreadable response.");
  }

  const root = asObject(asObject(body)?.MRData);
  if (!root) {
    throw new F1ProviderError("invalid_response", "The F1 data source returned an unexpected response shape.");
  }

  return root;
}

function toUtcIso(date: unknown, time: unknown): string | null {
  const day = asString(date);
  const clock = asString(time);
  if (!day || !clock) return null;

  const iso = /Z$|[+-]\d{2}:?\d{2}$/.test(clock) ? `${day}T${clock}` : `${day}T${clock}Z`;
  return Number.isFinite(Date.parse(iso)) ? new Date(iso).toISOString() : null;
}

const SESSION_FIELDS: Array<{ field: string; key: F1SessionKey; label: string }> = [
  { field: "FirstPractice", key: "fp1", label: "Practice 1" },
  { field: "SecondPractice", key: "fp2", label: "Practice 2" },
  { field: "ThirdPractice", key: "fp3", label: "Practice 3" },
  { field: "SprintQualifying", key: "sprintQualifying", label: "Sprint Qualifying" },
  { field: "SprintShootout", key: "sprintShootout", label: "Sprint Shootout" },
  { field: "Sprint", key: "sprint", label: "Sprint" },
  { field: "Qualifying", key: "qualifying", label: "Qualifying" },
];

function normalizeRace(raw: unknown): F1Race | null {
  const race = asObject(raw);
  if (!race) return null;

  const round = asNumber(race.round);
  const name = asString(race.raceName);
  const raceDate = asString(race.date);
  if (round === null || !name || !raceDate) return null;

  const circuit = asObject(race.Circuit);
  const location = asObject(circuit?.Location);
  const raceStartUtc = toUtcIso(race.date, race.time);

  const sessions: F1Session[] = [];
  for (const { field, key, label } of SESSION_FIELDS) {
    const session = asObject(race[field]);
    const startUtc = session ? toUtcIso(session.date, session.time) : null;
    if (startUtc) sessions.push({ key, label, startUtc });
  }
  if (raceStartUtc) sessions.push({ key: "race", label: "Grand Prix", startUtc: raceStartUtc });

  sessions.sort((a, b) => Date.parse(a.startUtc) - Date.parse(b.startUtc));

  return {
    season: asString(race.season) ?? "",
    round,
    name,
    circuitName: asString(circuit?.circuitName) ?? "Circuit unavailable",
    locality: asString(location?.locality) ?? "",
    country: asString(location?.country) ?? "",
    raceDate,
    raceStartUtc,
    sessions,
    isSprintWeekend: sessions.some((session) => session.key === "sprint"),
  };
}

export async function fetchCalendar(seasonParam: string, revalidateSeconds: number): Promise<{ season: string; races: F1Race[] }> {
  const root = await jolpicaGet(`/${encodeURIComponent(seasonParam)}/races.json?limit=100`, revalidateSeconds);
  const table = asObject(root.RaceTable);
  const races = asArray(table?.Races)
    .map(normalizeRace)
    .filter((race): race is F1Race => race !== null)
    .sort((a, b) => a.round - b.round);

  const season = asString(table?.season) ?? races[0]?.season ?? (seasonParam === "current" ? "" : seasonParam);
  return { season, races };
}

function normalizeDriver(raw: unknown, fallbackNumber?: unknown): F1Driver {
  const driver = asObject(raw);
  const given = asString(driver?.givenName) ?? "";
  const family = asString(driver?.familyName) ?? "";
  const name = `${given} ${family}`.trim();

  return {
    id: asString(driver?.driverId) ?? "",
    code: asString(driver?.code) ?? "",
    name: name || "Driver unavailable",
    number: asString(driver?.permanentNumber) ?? asString(fallbackNumber) ?? "",
  };
}

function normalizeTeam(raw: unknown): F1Team {
  const team = asObject(raw);
  return {
    id: asString(team?.constructorId) ?? "",
    name: asString(team?.name) ?? "Team unavailable",
  };
}

function normalizeRaceResultRow(raw: unknown): F1RaceResultRow | null {
  const row = asObject(raw);
  if (!row || !asObject(row.Driver)) return null;

  const time = asObject(row.Time);
  const fastest = asObject(asObject(row.FastestLap)?.Time);

  return {
    position: asNumber(row.position),
    positionText: asString(row.positionText) ?? asString(row.position) ?? "",
    driver: normalizeDriver(row.Driver, row.number),
    team: normalizeTeam(row.Constructor),
    grid: asNumber(row.grid),
    laps: asNumber(row.laps),
    timeOrGap: asString(time?.time),
    status: asString(row.status) ?? "",
    points: asNumber(row.points),
    fastestLapTime: asString(fastest?.time),
  };
}

function normalizeQualifyingRow(raw: unknown): F1QualifyingRow | null {
  const row = asObject(raw);
  if (!row || !asObject(row.Driver)) return null;

  return {
    position: asNumber(row.position),
    driver: normalizeDriver(row.Driver, row.number),
    team: normalizeTeam(row.Constructor),
    q1: asString(row.Q1),
    q2: asString(row.Q2),
    q3: asString(row.Q3),
  };
}

function firstRace(root: Json): Json | null {
  const races = asArray(asObject(root.RaceTable)?.Races);
  return asObject(races[0]);
}

export async function fetchRaceResults(season: string, round: number, revalidateSeconds: number): Promise<F1RaceResultRow[]> {
  const root = await jolpicaGet(`/${season}/${round}/results.json?limit=100`, revalidateSeconds);
  return asArray(firstRace(root)?.Results)
    .map(normalizeRaceResultRow)
    .filter((row): row is F1RaceResultRow => row !== null);
}

export async function fetchSprintResults(season: string, round: number, revalidateSeconds: number): Promise<F1RaceResultRow[]> {
  const root = await jolpicaGet(`/${season}/${round}/sprint.json?limit=100`, revalidateSeconds);
  return asArray(firstRace(root)?.SprintResults)
    .map(normalizeRaceResultRow)
    .filter((row): row is F1RaceResultRow => row !== null);
}

export async function fetchQualifyingResults(season: string, round: number, revalidateSeconds: number): Promise<F1QualifyingRow[]> {
  const root = await jolpicaGet(`/${season}/${round}/qualifying.json?limit=100`, revalidateSeconds);
  return asArray(firstRace(root)?.QualifyingResults)
    .map(normalizeQualifyingRow)
    .filter((row): row is F1QualifyingRow => row !== null);
}

function standingsList(root: Json): Json | null {
  const lists = asArray(asObject(root.StandingsTable)?.StandingsLists);
  return asObject(lists[0]);
}

export async function fetchDriverStandings(
  season: string,
  revalidateSeconds: number,
): Promise<{ round: number | null; rows: F1DriverStanding[] }> {
  const root = await jolpicaGet(`/${season}/driverstandings.json?limit=100`, revalidateSeconds);
  const list = standingsList(root);

  const rows = asArray(list?.DriverStandings)
    .map((raw): F1DriverStanding | null => {
      const row = asObject(raw);
      const points = asNumber(row?.points);
      if (!row || !asObject(row.Driver) || points === null) return null;

      return {
        position: asNumber(row.position),
        positionText: asString(row.positionText) ?? asString(row.position) ?? "",
        points,
        wins: asNumber(row.wins),
        driver: normalizeDriver(row.Driver),
        teams: asArray(row.Constructors)
          .map((team) => normalizeTeam(team).name)
          .filter((name) => name !== "Team unavailable"),
      };
    })
    .filter((row): row is F1DriverStanding => row !== null);

  return { round: asNumber(list?.round), rows };
}

export async function fetchConstructorStandings(
  season: string,
  revalidateSeconds: number,
): Promise<{ round: number | null; rows: F1ConstructorStanding[] }> {
  const root = await jolpicaGet(`/${season}/constructorstandings.json?limit=100`, revalidateSeconds);
  const list = standingsList(root);

  const rows = asArray(list?.ConstructorStandings)
    .map((raw): F1ConstructorStanding | null => {
      const row = asObject(raw);
      const points = asNumber(row?.points);
      if (!row || !asObject(row.Constructor) || points === null) return null;

      return {
        position: asNumber(row.position),
        positionText: asString(row.positionText) ?? asString(row.position) ?? "",
        points,
        wins: asNumber(row.wins),
        team: normalizeTeam(row.Constructor),
      };
    })
    .filter((row): row is F1ConstructorStanding => row !== null);

  return { round: asNumber(list?.round), rows };
}
