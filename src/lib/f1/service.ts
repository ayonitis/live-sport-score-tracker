import "server-only";

import { unstable_cache } from "next/cache";
import {
  F1ProviderError,
  fetchCalendar,
  fetchConstructorStandings,
  fetchDriverStandings,
  fetchQualifyingResults,
  fetchRaceResults,
  fetchSprintResults,
} from "@/lib/f1/jolpica";
import { getWeekendEndMs, hasWeekendStarted, pickFocusRound, pickLastCompletedRound } from "@/lib/f1/schedule-utils";
import type {
  F1Calendar,
  F1InitialData,
  F1Race,
  F1ResultSessionKind,
  F1RoundResults,
  F1Standings,
} from "@/lib/f1/types";

const HOUR = 60 * 60;
const DAY = 24 * HOUR;
const FIRST_SEASON = 1950;

export function getCurrentUtcYear(): number {
  return new Date().getUTCFullYear();
}

/** Accepts "current" or a four-digit season between 1950 and next year. Returns null for anything else. */
export function normalizeSeasonParam(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value === "current") return "current";
  if (!/^\d{4}$/.test(value)) return null;

  const year = Number(value);
  return year >= FIRST_SEASON && year <= getCurrentUtcYear() + 1 ? value : null;
}

export function normalizeRoundParam(value: string | null | undefined): number | null {
  if (!value || !/^\d{1,2}$/.test(value)) return null;
  const round = Number(value);
  return round >= 1 && round <= 40 ? round : null;
}

function calendarTtl(seasonParam: string): number {
  return seasonParam === "current" || seasonParam === String(getCurrentUtcYear()) ? HOUR : 7 * DAY;
}

function standingsTtl(season: string): number {
  return season === String(getCurrentUtcYear()) ? 15 * 60 : 7 * DAY;
}

/** Recent or in-progress weekends refresh quickly; older results are effectively fixed. */
function resultsTtl(race: F1Race, nowMs: number): number {
  const end = getWeekendEndMs(race);
  if (end === null) return DAY;
  if (nowMs < end) return 2 * 60;
  if (nowMs < end + 3 * DAY) return 5 * 60;
  return 7 * DAY;
}

export async function getSeasonCalendar(seasonParam: string): Promise<F1Calendar> {
  const ttl = calendarTtl(seasonParam);

  const load = unstable_cache(
    async (): Promise<F1Calendar> => {
      const { season, races } = await fetchCalendar(seasonParam, ttl);
      return { season, races, fetchedAt: new Date().toISOString() };
    },
    [`f1-calendar-v1-${seasonParam}`],
    { revalidate: ttl },
  );

  return load();
}

type KindFetcher<T> = () => Promise<T>;

function cachedKind<T>(key: string, ttl: number, fetcher: KindFetcher<T>): Promise<T> {
  return unstable_cache(fetcher, [key], { revalidate: ttl })();
}

export async function getRoundResults(season: string, round: number): Promise<F1RoundResults> {
  const calendar = await getSeasonCalendar(season);
  const race = calendar.races.find((item) => item.round === round);

  if (!race) {
    throw new F1ProviderError("invalid_response", "That round is not in this season's calendar.");
  }

  const nowMs = Date.now();
  const empty: F1RoundResults = {
    season: calendar.season,
    round,
    raceName: race.name,
    race: [],
    sprint: [],
    qualifying: [],
    failedSessions: [],
    fetchedAt: new Date().toISOString(),
  };

  // Nothing can have been run yet, so do not spend provider requests asking.
  if (!hasWeekendStarted(race, nowMs)) {
    return empty;
  }

  const ttl = resultsTtl(race, nowMs);
  const keyBase = `f1-results-v1-${calendar.season}-${round}`;
  // Sprints only exist from 2021. When the calendar publishes sessions, trust it; otherwise ask for 2021 and later.
  const includeSprint = race.isSprintWeekend || (race.sessions.every((s) => s.key === "race") && Number(calendar.season) >= 2021);

  const kinds: F1ResultSessionKind[] = includeSprint ? ["race", "qualifying", "sprint"] : ["race", "qualifying"];
  const settled = await Promise.allSettled(
    kinds.map((kind) => {
      if (kind === "race") return cachedKind(`${keyBase}-race`, ttl, () => fetchRaceResults(calendar.season, round, ttl));
      if (kind === "qualifying") return cachedKind(`${keyBase}-qualifying`, ttl, () => fetchQualifyingResults(calendar.season, round, ttl));
      return cachedKind(`${keyBase}-sprint`, ttl, () => fetchSprintResults(calendar.season, round, ttl));
    }),
  );

  const failedSessions: F1ResultSessionKind[] = [];
  const result: F1RoundResults = { ...empty, fetchedAt: new Date().toISOString() };

  settled.forEach((outcome, index) => {
    const kind = kinds[index];
    if (outcome.status === "rejected") {
      failedSessions.push(kind);
      return;
    }

    if (kind === "race") result.race = outcome.value as F1RoundResults["race"];
    else if (kind === "sprint") result.sprint = outcome.value as F1RoundResults["sprint"];
    else result.qualifying = outcome.value as F1RoundResults["qualifying"];
  });

  if (failedSessions.length === kinds.length) {
    const reason = settled.find((outcome): outcome is PromiseRejectedResult => outcome.status === "rejected")?.reason;
    throw reason instanceof Error ? reason : new F1ProviderError("network", "Unable to load results.");
  }

  result.failedSessions = failedSessions;
  return result;
}

export async function getStandings(season: string): Promise<F1Standings> {
  const ttl = standingsTtl(season);
  const keyBase = `f1-standings-v1-${season}`;

  const [drivers, constructors] = await Promise.allSettled([
    cachedKind(`${keyBase}-drivers`, ttl, () => fetchDriverStandings(season, ttl)),
    cachedKind(`${keyBase}-constructors`, ttl, () => fetchConstructorStandings(season, ttl)),
  ]);

  if (drivers.status === "rejected" && constructors.status === "rejected") {
    throw drivers.reason instanceof Error ? drivers.reason : new F1ProviderError("network", "Unable to load standings.");
  }

  const failed: F1Standings["failed"] = [];
  if (drivers.status === "rejected") failed.push("drivers");
  if (constructors.status === "rejected") failed.push("constructors");

  const round =
    (drivers.status === "fulfilled" ? drivers.value.round : null) ??
    (constructors.status === "fulfilled" ? constructors.value.round : null);

  return {
    season,
    round,
    drivers: drivers.status === "fulfilled" ? drivers.value.rows : [],
    constructors: constructors.status === "fulfilled" ? constructors.value.rows : [],
    failed,
    fetchedAt: new Date().toISOString(),
  };
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to load F1 data.";
}

/** Builds everything the first render needs. Never throws: each section reports its own error. */
export async function getF1InitialData(): Promise<F1InitialData> {
  const generatedAt = Date.now();
  const base: F1InitialData = {
    generatedAt,
    season: null,
    calendar: null,
    calendarError: null,
    eventRound: null,
    resultsRound: null,
    results: null,
    resultsError: null,
    standings: null,
    standingsError: null,
  };

  let calendar: F1Calendar;
  try {
    calendar = await getSeasonCalendar("current");
  } catch (error) {
    return { ...base, calendarError: messageOf(error) };
  }

  if (!calendar.season || calendar.races.length === 0) {
    return { ...base, calendar, season: calendar.season || null, calendarError: "The data source returned no races for the current season." };
  }

  const eventRound = pickFocusRound(calendar.races, generatedAt);
  const resultsRound = pickLastCompletedRound(calendar.races, generatedAt) ?? eventRound;

  const [resultsOutcome, standingsOutcome] = await Promise.allSettled([
    resultsRound === null ? Promise.resolve(null) : getRoundResults(calendar.season, resultsRound),
    getStandings(calendar.season),
  ]);

  return {
    ...base,
    season: calendar.season,
    calendar,
    eventRound,
    resultsRound,
    results: resultsOutcome.status === "fulfilled" ? resultsOutcome.value : null,
    resultsError: resultsOutcome.status === "rejected" ? messageOf(resultsOutcome.reason) : null,
    standings: standingsOutcome.status === "fulfilled" ? standingsOutcome.value : null,
    standingsError: standingsOutcome.status === "rejected" ? messageOf(standingsOutcome.reason) : null,
  };
}

export { messageOf as describeF1Error };
