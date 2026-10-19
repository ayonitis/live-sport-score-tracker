import type { F1Race, F1Session, F1SessionKey } from "@/lib/f1/types";

/** A grand prix is treated as over this long after lights out, whatever its real length. */
export const RACE_WINDOW_MS = 3 * 60 * 60 * 1000;
/** A non-race session is treated as "possibly still running" for this long after it starts. */
export const SESSION_WINDOW_MS = 2 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DHAKA_TZ = "Asia/Dhaka";

export type WeekendStatus = "upcoming" | "in_progress" | "completed";
export type SessionStatus = "upcoming" | "started" | "past" | "results";

function parseMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

/** Start of the race in ms. When only a date is known, the start of that UTC day. */
export function getRaceStartMs(race: F1Race): number | null {
  return parseMs(race.raceStartUtc) ?? parseMs(`${race.raceDate}T00:00:00Z`);
}

/** End of the race weekend in ms: lights out + window, or the end of the race day when no start time is known. */
export function getWeekendEndMs(race: F1Race): number | null {
  const exact = parseMs(race.raceStartUtc);
  if (exact !== null) return exact + RACE_WINDOW_MS;

  const dayStart = parseMs(`${race.raceDate}T00:00:00Z`);
  return dayStart === null ? null : dayStart + DAY_MS;
}

/** First published session start, falling back to two days before the race. */
export function getWeekendStartMs(race: F1Race): number | null {
  const starts = race.sessions.map((session) => parseMs(session.startUtc)).filter((ms): ms is number => ms !== null);
  if (starts.length > 0) return Math.min(...starts);

  const raceStart = getRaceStartMs(race);
  return raceStart === null ? null : raceStart - 2 * DAY_MS;
}

/** Status derived purely from the published schedule. It is not live data. */
export function getWeekendStatus(race: F1Race, nowMs: number): WeekendStatus {
  const start = getWeekendStartMs(race);
  const end = getWeekendEndMs(race);

  if (end !== null && nowMs >= end) return "completed";
  if (start !== null && nowMs >= start) return "in_progress";
  return "upcoming";
}

/** Whether anything on this weekend could already have produced results. */
export function hasWeekendStarted(race: F1Race, nowMs: number): boolean {
  const start = getWeekendStartMs(race);
  return start !== null && nowMs >= start;
}

/** The weekend that is under way, otherwise the next one, otherwise the last of the season. */
export function pickFocusRound(races: F1Race[], nowMs: number): number | null {
  if (races.length === 0) return null;

  const sorted = [...races].sort((a, b) => a.round - b.round);
  const underWay = sorted.find((race) => getWeekendStatus(race, nowMs) === "in_progress");
  if (underWay) return underWay.round;

  const next = sorted.find((race) => getWeekendStatus(race, nowMs) === "upcoming");
  if (next) return next.round;

  return sorted[sorted.length - 1].round;
}

/** The most recent weekend that has finished according to the schedule. */
export function pickLastCompletedRound(races: F1Race[], nowMs: number): number | null {
  const completed = [...races].sort((a, b) => b.round - a.round).find((race) => getWeekendStatus(race, nowMs) === "completed");
  return completed ? completed.round : null;
}

export function getSessionStatus(session: F1Session, nowMs: number, hasResults: boolean): SessionStatus {
  if (hasResults) return "results";

  const start = parseMs(session.startUtc);
  if (start === null || nowMs < start) return "upcoming";

  const window = session.key === "race" ? RACE_WINDOW_MS : SESSION_WINDOW_MS;
  return nowMs < start + window ? "started" : "past";
}

export function getNextSession(race: F1Race, nowMs: number): F1Session | null {
  return (
    race.sessions.find((session) => {
      const start = parseMs(session.startUtc);
      return start !== null && start > nowMs;
    }) ?? null
  );
}

export function sessionHasResultsKey(key: F1SessionKey): key is "race" | "qualifying" | "sprint" {
  return key === "race" || key === "qualifying" || key === "sprint";
}

export function formatDhakaDateTime(iso: string): { day: string; time: string } {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { day: "Date unavailable", time: "" };

  return {
    day: new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: DHAKA_TZ }).format(date),
    time: new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: DHAKA_TZ }).format(date),
  };
}

/** Formats a plain yyyy-mm-dd date with no timezone conversion. */
export function formatPlainDate(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return dateString;

  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date);
}

export function formatDhakaClock(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: DHAKA_TZ }).format(date);
}

export function formatCountdown(targetMs: number, nowMs: number): string {
  const diff = Math.max(0, targetMs - nowMs);
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (value: number) => String(value).padStart(2, "0");
  return days > 0 ? `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s` : `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}
