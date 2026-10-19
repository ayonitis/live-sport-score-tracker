import "server-only";

import { unstable_cache } from "next/cache";
import { preferredClubCompetitions, preferredInternationalCompetitions } from "@/lib/rugby/preferred-competitions";
import type {
  PreferredRugbyCompetitionTarget,
  RugbyCompetitionCatalog,
  RugbyCompetitionFilterItem,
  RugbyDiagnostics,
  RugbyMatch,
  RugbyMatchStatus,
  RugbyOverviewData,
  RugbyProviderGame,
  RugbyProviderLeague,
  RugbyProviderScorePair,
} from "@/lib/rugby/types";

/**
 * Rugby data comes from API-Sports Rugby (v1). The API key is read from the server-only
 * `API_SPORTS_KEY` environment variable and is never sent to the browser.
 */
const API_BASE_URL = (process.env.API_SPORTS_RUGBY_BASE_URL?.trim() || "https://v1.rugby.api-sports.io").replace(/\/+$/, "");
const DHAKA_TIMEZONE = "Asia/Dhaka";
const REQUEST_TIMEOUT_MS = 10_000;
const CATALOG_REVALIDATE_SECONDS = 60 * 60 * 24;
const PAST_DATE_REVALIDATE_SECONDS = 60 * 60 * 6;
const FUTURE_DATE_REVALIDATE_SECONDS = 60 * 30;
const DEFAULT_LIVE_REVALIDATE_SECONDS = 90;
const MIN_LIVE_REVALIDATE_SECONDS = 30;

const LIMITATION_NOTE =
  "Rugby union competitions only. Rugby league (NRL, Super League, State of Origin) is not covered by the current data provider. Curated competitions are listed only when the provider reports an active season for them.";

type ApiSportsEnvelope<T> = {
  get?: string;
  errors?: unknown;
  results?: number;
  response?: T[];
};

type GamesFetchResult = {
  fetchedAt: string;
  games: RugbyProviderGame[];
};

function getApiKey(): string | null {
  const key = process.env.API_SPORTS_KEY?.trim();
  return key ? key : null;
}

function getLiveRevalidateSeconds(): number {
  const parsed = Number(process.env.RUGBY_LIVE_REVALIDATE_SECONDS);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LIVE_REVALIDATE_SECONDS;
  }

  return Math.max(MIN_LIVE_REVALIDATE_SECONDS, Math.round(parsed));
}

function normalizeKey(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function formatDhakaDate(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DHAKA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function getTodayDhakaDate(): string {
  return formatDhakaDate(new Date());
}

function isValidDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

function getUtcDatesForDhakaDate(dhakaDate: string): string[] {
  const start = new Date(`${dhakaDate}T00:00:00+06:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return Array.from(new Set<string>([start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)]));
}

function getRevalidateSecondsForUtcDate(utcDate: string): number {
  const todayUtc = new Date().toISOString().slice(0, 10);
  const diffDays = Math.round((Date.parse(`${utcDate}T00:00:00Z`) - Date.parse(`${todayUtc}T00:00:00Z`)) / 86_400_000);

  if (diffDays >= -1 && diffDays <= 1) return getLiveRevalidateSeconds();
  if (diffDays < -1) return PAST_DATE_REVALIDATE_SECONDS;
  return FUTURE_DATE_REVALIDATE_SECONDS;
}

function extractProviderErrors(errors: unknown): string[] {
  if (!errors) return [];

  const values = Array.isArray(errors) ? errors : typeof errors === "object" ? Object.values(errors as Record<string, unknown>) : [errors];

  return values.map((value) => (typeof value === "string" ? value.trim() : "")).filter((value) => value.length > 0);
}

async function fetchApiSports<T>(path: string, params: Record<string, string>, revalidateSeconds: number): Promise<T[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Rugby data is not configured. Set API_SPORTS_KEY on the server.");
  }

  const query = new URLSearchParams(params).toString();
  const url = `${API_BASE_URL}${path}${query ? `?${query}` : ""}`;

  const response = await fetch(url, {
    headers: { Accept: "application/json", "x-apisports-key": apiKey },
    next: { revalidate: revalidateSeconds },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Rugby provider request failed (${response.status}).`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("Rugby provider returned a non-JSON response.");
  }

  const body = (await response.json()) as ApiSportsEnvelope<T> | null;

  // API-Sports reports quota, plan and parameter problems with HTTP 200 and a populated `errors` field.
  const providerErrors = extractProviderErrors(body?.errors);
  if (providerErrors.length > 0) {
    throw new Error(`Rugby provider error: ${providerErrors.join("; ").slice(0, 200)}`);
  }

  if (!body || !Array.isArray(body.response)) {
    throw new Error("Rugby provider returned an unexpected response shape.");
  }

  return body.response;
}

function toScoreText(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function toScorePairText(pair: RugbyProviderScorePair | null | undefined): string | null {
  const home = toScoreText(pair?.home);
  const away = toScoreText(pair?.away);
  return home !== null && away !== null ? `${home}-${away}` : null;
}

const LIVE_STATUS_CODES = new Set(["LIVE", "1H", "2H", "HT", "ET", "BT", "PT", "PEN", "INTR"]);
const FINISHED_STATUS_CODES = new Set(["FT", "AET", "AP", "AOT", "AWD", "WO"]);

function toMatchStatus(shortCode?: string | null, longText?: string | null): RugbyMatchStatus {
  const code = (shortCode ?? "").trim().toUpperCase();

  if (code === "NS" || code === "TBD") return "upcoming";
  if (LIVE_STATUS_CODES.has(code)) return "live";
  if (FINISHED_STATUS_CODES.has(code)) return "finished";
  if (code === "PST") return "postponed";
  if (code === "CANC") return "cancelled";
  if (code === "ABD") return "abandoned";
  if (code === "SUSP") return "suspended";

  const text = normalizeKey(longText ?? "");
  if (!text) return "unknown";
  if (text.includes("postpon")) return "postponed";
  if (text.includes("cancel")) return "cancelled";
  if (text.includes("abandon")) return "abandoned";
  if (text.includes("suspend")) return "suspended";
  if (text.includes("not started") || text.includes("scheduled")) return "upcoming";
  if (text.includes("finish") || text.includes("after extra")) return "finished";
  if (/(first half|second half|half ?time|extra time|break|penalt|in play|live)/.test(text)) return "live";

  return "unknown";
}

function defaultStatusText(status: RugbyMatchStatus): string {
  switch (status) {
    case "live":
      return "Live";
    case "upcoming":
      return "Scheduled";
    case "finished":
      return "Finished";
    case "postponed":
      return "Postponed";
    case "cancelled":
      return "Cancelled";
    case "abandoned":
      return "Abandoned";
    case "suspended":
      return "Suspended";
    default:
      return "Status unavailable";
  }
}

function toKickoffIso(game: RugbyProviderGame): string {
  const timestamp = Number(game.timestamp);
  if (Number.isFinite(timestamp) && timestamp > 0) {
    return new Date(timestamp * 1000).toISOString();
  }

  if (game.date) {
    const parsed = new Date(game.date);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return "";
}

function normalizeGame(game: RugbyProviderGame): RugbyMatch | null {
  const id = game.id === undefined || game.id === null ? "" : String(game.id);
  const leagueId = game.league?.id === undefined || game.league?.id === null ? "" : String(game.league.id);
  const homeName = game.teams?.home?.name?.trim() || "";
  const awayName = game.teams?.away?.name?.trim() || "";

  // Without an id, a league, or any team name there is nothing trustworthy to show.
  if (!id || !leagueId || (!homeName && !awayName)) {
    return null;
  }

  const kickoffUtc = toKickoffIso(game);
  const status = toMatchStatus(game.status?.short, game.status?.long);
  const leagueName = game.league?.name?.trim() || "Competition";

  return {
    id,
    url: "",
    homeTeam: { name: homeName || "TBC", logoUrl: game.teams?.home?.logo?.trim() || "" },
    awayTeam: { name: awayName || "TBC", logoUrl: game.teams?.away?.logo?.trim() || "" },
    homeScore: toScoreText(game.scores?.home) ?? "-",
    awayScore: toScoreText(game.scores?.away) ?? "-",
    status,
    statusText: game.status?.long?.trim() || defaultStatusText(status),
    kickoffUtc,
    halfTimeScore: toScorePairText(game.periods?.first),
    extraTimeScore: toScorePairText(game.periods?.overtime),
    competition: {
      id: leagueId,
      name: leagueName,
      logoUrl: game.league?.logo?.trim() || "",
      key: normalizeKey(leagueName),
      countryName: game.country?.name?.trim() || "",
    },
  };
}

function isOnDhakaDate(kickoffUtc: string, dhakaDate: string): boolean {
  if (!kickoffUtc) return false;
  const date = new Date(kickoffUtc);
  return !Number.isNaN(date.getTime()) && formatDhakaDate(date) === dhakaDate;
}

async function fetchGamesByUtcDate(utcDate: string): Promise<GamesFetchResult> {
  const revalidate = getRevalidateSecondsForUtcDate(utcDate);

  const cachedFetcher = unstable_cache(
    async (): Promise<GamesFetchResult> => {
      const games = await fetchApiSports<RugbyProviderGame>("/games", { date: utcDate }, revalidate);
      return { fetchedAt: new Date().toISOString(), games };
    },
    [`api-sports-rugby-games-v1-${utcDate}`],
    { revalidate },
  );

  return cachedFetcher();
}

function leagueHasActiveSeason(league: RugbyProviderLeague, todayUtc: string): boolean {
  const seasons = league.seasons;

  // If the provider gives no season information at all, we cannot rule the competition out.
  if (!Array.isArray(seasons) || seasons.length === 0) return true;

  const today = Date.parse(`${todayUtc}T00:00:00Z`);
  const day = 86_400_000;

  return seasons.some((season) => {
    if (season.current === true) return true;

    const start = season.start ? Date.parse(season.start) : Number.NaN;
    const end = season.end ? Date.parse(season.end) : Number.NaN;
    if (Number.isNaN(start) || Number.isNaN(end)) return false;

    return start <= today + 90 * day && end >= today - 30 * day;
  });
}

function resolveTarget(
  target: PreferredRugbyCompetitionTarget,
  leagues: RugbyProviderLeague[],
  todayUtc: string,
): RugbyCompetitionFilterItem | null {
  const names = new Set([target.label, ...target.aliases].map(normalizeKey));
  const wantedCountry = normalizeKey(target.country);

  const candidates = leagues.filter((league) => {
    const name = normalizeKey(league.name ?? "");
    const country = normalizeKey(league.country?.name ?? "");
    return league.id !== undefined && league.id !== null && names.has(name) && country === wantedCountry;
  });

  const active = candidates.filter((league) => leagueHasActiveSeason(league, todayUtc));
  const best = active.find((league) => league.seasons?.some((season) => season.current === true)) ?? active[0];

  if (!best) return null;

  return {
    key: target.key,
    id: String(best.id),
    name: best.name?.trim() || target.label,
    logoUrl: best.logo?.trim() || "",
    countryName: best.country?.name?.trim() || target.country,
    supported: true,
  };
}

const getCachedLeagues = unstable_cache(
  async (): Promise<RugbyProviderLeague[]> =>
    fetchApiSports<RugbyProviderLeague>("/leagues", {}, CATALOG_REVALIDATE_SECONDS),
  ["api-sports-rugby-leagues-v1"],
  { revalidate: CATALOG_REVALIDATE_SECONDS },
);

async function buildCatalog(): Promise<{ catalog: RugbyCompetitionCatalog; failed: boolean }> {
  try {
    const leagues = await getCachedLeagues();
    const todayUtc = new Date().toISOString().slice(0, 10);
    const resolve = (targets: PreferredRugbyCompetitionTarget[]) =>
      targets.map((target) => resolveTarget(target, leagues, todayUtc)).filter((item): item is RugbyCompetitionFilterItem => item !== null);

    return {
      catalog: {
        internationalCompetitions: resolve(preferredInternationalCompetitions),
        clubCompetitions: resolve(preferredClubCompetitions),
        limitationNote: LIMITATION_NOTE,
      },
      failed: false,
    };
  } catch {
    return {
      catalog: { internationalCompetitions: [], clubCompetitions: [], limitationNote: LIMITATION_NOTE },
      failed: true,
    };
  }
}

function buildOtherCompetitions(matches: RugbyMatch[], catalog: RugbyCompetitionCatalog): RugbyCompetitionFilterItem[] {
  const knownIds = new Set([...catalog.internationalCompetitions, ...catalog.clubCompetitions].map((item) => item.id));
  const others = new Map<string, RugbyCompetitionFilterItem>();

  for (const match of matches) {
    if (knownIds.has(match.competition.id) || others.has(match.competition.id)) continue;

    others.set(match.competition.id, {
      key: `league-${match.competition.id}`,
      id: match.competition.id,
      name: match.competition.name,
      logoUrl: match.competition.logoUrl,
      countryName: match.competition.countryName,
      supported: true,
    });
  }

  return Array.from(others.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getRugbyOverview(date?: string): Promise<RugbyOverviewData> {
  const safeDhakaDate = date && isValidDateString(date) ? date : getTodayDhakaDate();
  const utcDates = getUtcDatesForDhakaDate(safeDhakaDate);

  if (!getApiKey()) {
    throw new Error("Rugby data is not configured. Set API_SPORTS_KEY on the server.");
  }

  const [catalogResult, gameResults] = await Promise.all([
    buildCatalog(),
    Promise.allSettled(utcDates.map((utcDate) => fetchGamesByUtcDate(utcDate))),
  ]);

  const fulfilled = gameResults.filter((result): result is PromiseFulfilledResult<GamesFetchResult> => result.status === "fulfilled");
  const rejected = gameResults.filter((result): result is PromiseRejectedResult => result.status === "rejected");

  if (fulfilled.length === 0) {
    const reason = rejected[0]?.reason;
    throw new Error(reason instanceof Error ? reason.message : "Unable to load rugby fixtures.");
  }

  const normalized = fulfilled
    .flatMap((result) => result.value.games)
    .map(normalizeGame)
    .filter((match): match is RugbyMatch => match !== null)
    .filter((match) => isOnDhakaDate(match.kickoffUtc, safeDhakaDate));

  const matches = Array.from(new Map(normalized.map((match) => [match.id, match])).values()).sort(
    (a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime(),
  );

  const failedRequests = rejected.length + (catalogResult.failed ? 1 : 0);
  const technicalNotes: string[] = [];
  if (rejected.length > 0) technicalNotes.push(`${rejected.length} fixture request(s) failed.`);
  if (catalogResult.failed) technicalNotes.push("Competition metadata request failed.");

  const dataAsOf = fulfilled
    .map((result) => result.value.fetchedAt)
    .sort()
    .at(0) ?? null;

  const diagnostics: RugbyDiagnostics = {
    provider: "api-sports",
    timezone: "Asia/Dhaka",
    requestedDhakaDate: safeDhakaDate,
    queriedUtcDates: utcDates,
    failedRequests,
    completeness: rejected.length === 0 ? "complete" : "partial",
    technicalNotes,
  };

  return {
    date: safeDhakaDate,
    matches,
    competitionCatalog: catalogResult.catalog,
    otherCompetitions: buildOtherCompetitions(matches, catalogResult.catalog),
    dataAsOf,
    diagnostics,
    providerError: null,
  };
}

/** Never throws: used by the server-rendered page so a provider problem shows a message instead of a crash. */
export async function getRugbyOverviewSafe(date?: string): Promise<RugbyOverviewData> {
  try {
    return await getRugbyOverview(date);
  } catch (error) {
    const safeDhakaDate = date && isValidDateString(date) ? date : getTodayDhakaDate();

    return {
      date: safeDhakaDate,
      matches: [],
      competitionCatalog: { internationalCompetitions: [], clubCompetitions: [], limitationNote: LIMITATION_NOTE },
      otherCompetitions: [],
      dataAsOf: null,
      diagnostics: {
        provider: "api-sports",
        timezone: "Asia/Dhaka",
        requestedDhakaDate: safeDhakaDate,
        queriedUtcDates: getUtcDatesForDhakaDate(safeDhakaDate),
        failedRequests: 1,
        completeness: "partial",
        technicalNotes: [],
      },
      providerError: error instanceof Error ? error.message : "Unable to load rugby fixtures.",
    };
  }
}
