import "server-only";

import { unstable_cache } from "next/cache";
import {
  preferredTopDomesticLeagues,
  preferredTopInternationalCompetitions,
} from "@/lib/cricket/preferred-competitions";
import type {
  CricketCompetitionCatalog,
  CricketCompetitionFilterItem,
  CricketDiagnostics,
  CricketFormat,
  CricketMatch,
  CricketMatchStatus,
  CricketOverviewData,
  CricketProviderMatch,
  PreferredCricketCompetitionTarget,
} from "@/lib/cricket/types";

const SPORTSCORE_BASE_URL = "https://sportscore.com";
const CRICKET_SPORT = "cricket";
const DHAKA_TIMEZONE = "Asia/Dhaka";
const SPORTSC0RE_MAX_DAY_LIMIT = 200;

type SportScoreSearchCompetition = {
  name?: string;
  slug?: string;
  logo?: string;
};

type SportScoreSearchResponse = {
  competitions?: SportScoreSearchCompetition[];
};

type SportScoreFixturesResponse = {
  date?: string;
  count?: number;
  matches?: CricketProviderMatch[];
};

type FixturesFetchResult = {
  count: number;
  matches: CricketProviderMatch[];
};

function normalizeKey(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugify(value: string): string {
  return normalizeKey(value).replace(/\s+/g, "-");
}

function parseMatchId(match: CricketProviderMatch): string {
  const url = match.url?.trim() ?? "";

  if (!url) {
    return `${slugify(match.home ?? "home")}-${slugify(match.away ?? "away")}-${match.time ?? "time"}`;
  }

  const segments = url.split("/").filter(Boolean);
  return segments.at(-1) ?? url;
}

function parseStatusFromText(text?: string): CricketMatchStatus {
  const normalized = normalizeKey(text ?? "");

  if (!normalized) return "unknown";
  if (normalized.includes("postpon")) return "postponed";
  if (normalized.includes("cancel")) return "cancelled";
  if (normalized.includes("abandon")) return "abandoned";
  if (normalized.includes("delay")) return "delayed";
  if (normalized.includes("suspend")) return "suspended";
  if (normalized.includes("live") || normalized.includes("innings") || normalized.includes("stumps")) return "live";
  if (normalized.includes("finish") || normalized.includes("won by") || normalized.includes("draw")) return "finished";
  if (normalized.includes("upcoming") || normalized.includes("scheduled") || normalized.includes("not started")) {
    return "upcoming";
  }

  return "unknown";
}

function toMatchStatus(rawStatus?: string, rawStatusText?: string): CricketMatchStatus {
  if (rawStatus === "live" || rawStatus === "upcoming" || rawStatus === "finished") {
    return rawStatus;
  }

  return parseStatusFromText(rawStatusText);
}

function inferFormat(match: CricketProviderMatch): CricketFormat | null {
  const source = [match.competition ?? "", match.status_text ?? "", match.url ?? ""].join(" ").toLowerCase();

  if (/\btest\b|world test championship|first class/.test(source)) {
    return "test";
  }

  if (/\bodi\b|one day|list-a/.test(source)) {
    return "odi";
  }

  if (
    /\bt20\b|t20i|the hundred|big bash|ipl|psl|bpl|indian premier league|bangladesh premier league|pakistan super league/.test(
      source,
    )
  ) {
    return "t20";
  }

  return null;
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

function createUnsupportedItem(target: PreferredCricketCompetitionTarget): CricketCompetitionFilterItem {
  return {
    key: target.key,
    id: target.key,
    name: target.label,
    logoUrl: "",
    slug: "",
    matchKeys: [target.label, ...target.aliases].map(normalizeKey),
    supported: false,
    supportNote: "Unavailable until provider responses recover.",
  };
}

function isValidDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getUtcDatesForDhakaDate(dhakaDate: string): string[] {
  const start = new Date(`${dhakaDate}T00:00:00+06:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  const dates = new Set<string>([start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)]);
  return Array.from(dates);
}

function isMatchOnDhakaDate(utcKickoff: string, dhakaDate: string): boolean {
  if (!utcKickoff) return false;

  const date = new Date(utcKickoff);
  if (Number.isNaN(date.getTime())) return false;

  return formatDhakaDate(date) === dhakaDate;
}

function normalizeMatch(raw: CricketProviderMatch, competition: CricketCompetitionFilterItem): CricketMatch {
  const rawUrl = raw.url?.trim() || "";
  const resolvedUrl = rawUrl.startsWith("http") ? rawUrl : rawUrl ? `${SPORTSCORE_BASE_URL}${rawUrl}` : "";
  const resolvedCompetitionName = raw.competition?.trim() || competition.name;
  const resolvedCompetitionLogo = raw.competition_logo?.trim() || competition.logoUrl;

  return {
    id: parseMatchId(raw),
    url: resolvedUrl,
    homeTeam: {
      name: raw.home?.trim() || "Home team",
      logoUrl: raw.home_logo?.trim() || "",
      score: String(raw.home_score ?? "-") || "-",
    },
    awayTeam: {
      name: raw.away?.trim() || "Away team",
      logoUrl: raw.away_logo?.trim() || "",
      score: String(raw.away_score ?? "-") || "-",
    },
    status: toMatchStatus(raw.status, raw.status_text),
    statusText: raw.status_text?.trim() || "Scheduled",
    kickoffUtc: raw.time?.trim() || "",
    format: inferFormat(raw),
    competition: {
      id: competition.id,
      name: resolvedCompetitionName,
      logoUrl: resolvedCompetitionLogo,
      key: normalizeKey(resolvedCompetitionName),
    },
  };
}

async function fetchSportScoreJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    next: { revalidate: 60 },
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`SportScore cricket request failed (${response.status}): ${body.slice(0, 120)}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const body = await response.text();
    throw new Error(`SportScore returned non-JSON response: ${body.slice(0, 120)}`);
  }

  return (await response.json()) as T;
}

function isUndesiredCompetitionName(name: string): boolean {
  const normalized = normalizeKey(name);
  return normalized.includes("srl") || normalized.includes("fantasy") || normalized.includes("virtual");
}

function scoreCompetitionMatch(candidateName: string, preferredLabel: string, aliases: string[]): number {
  const normalizedCandidate = normalizeKey(candidateName);
  const preferredNames = [preferredLabel, ...aliases].map(normalizeKey);

  if (isUndesiredCompetitionName(candidateName)) {
    return -1;
  }

  if (preferredNames.includes(normalizedCandidate)) return 100;
  if (preferredNames.some((name) => normalizedCandidate.startsWith(name))) return 80;
  if (preferredNames.some((name) => normalizedCandidate.includes(name))) return 60;

  return 0;
}

function resolvePreferredCompetition(
  target: PreferredCricketCompetitionTarget,
  candidates: SportScoreSearchCompetition[],
): CricketCompetitionFilterItem {
  let best: SportScoreSearchCompetition | null = null;
  let bestScore = -1;

  for (const candidate of candidates) {
    const name = candidate.name?.trim();
    if (!name) continue;

    const score = scoreCompetitionMatch(name, target.label, target.aliases);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  if (!best || bestScore < 60) {
    return {
      key: target.key,
      id: target.key,
      name: target.label,
      logoUrl: "",
      slug: "",
      matchKeys: [target.label, ...target.aliases].map(normalizeKey),
      supported: false,
      supportNote: "Not found in current SportScore cricket competition metadata.",
    };
  }

  const resolvedName = best.name?.trim() || target.label;
  const slug = best.slug?.trim() || slugify(resolvedName);

  return {
    key: target.key,
    id: target.key,
    name: resolvedName,
    logoUrl: best.logo?.trim() || "",
    slug,
    matchKeys: Array.from(new Set([resolvedName, target.label, ...target.aliases].map(normalizeKey))),
    supported: true,
  };
}

async function fetchPreferredCompetitionTargets(
  targets: PreferredCricketCompetitionTarget[],
): Promise<CricketCompetitionFilterItem[]> {
  return Promise.all(
    targets.map(async (target) => {
      const params = new URLSearchParams({
        sport: CRICKET_SPORT,
        q: target.searchQuery,
        limit: "12",
      });

      const response = await fetchSportScoreJson<SportScoreSearchResponse>(
        `${SPORTSCORE_BASE_URL}/api/v1/search/?${params.toString()}`,
      );

      return resolvePreferredCompetition(target, response.competitions ?? []);
    }),
  );
}

const getCachedCricketCompetitionCatalog = unstable_cache(
  async (): Promise<CricketCompetitionCatalog> => {
    const [topInternationalCompetitions, topDomesticLeagues] = await Promise.all([
      fetchPreferredCompetitionTargets(preferredTopInternationalCompetitions),
      fetchPreferredCompetitionTargets(preferredTopDomesticLeagues),
    ]);

    return {
      topInternationalCompetitions,
      topDomesticLeagues,
      limitationNote:
        "SportScore cricket does not expose a dedicated full competition-catalog endpoint; curated entries are resolved via provider search metadata.",
    };
  },
  ["cricket-curated-competition-catalog-v1"],
  { revalidate: 60 * 60 * 6 },
);

async function fetchCompetitionFixturesByUtcDate(competitionSlug: string, utcDate: string): Promise<FixturesFetchResult> {
  const cacheKey = `sportscore-cricket-${competitionSlug}-${utcDate}`;

  const cachedFetcher = unstable_cache(
    async () => {
      const params = new URLSearchParams({
        sport: CRICKET_SPORT,
        competition: competitionSlug,
        date: utcDate,
        limit: String(SPORTSC0RE_MAX_DAY_LIMIT),
      });

      const response = await fetchSportScoreJson<SportScoreFixturesResponse>(
        `${SPORTSCORE_BASE_URL}/api/v1/fixtures/?${params.toString()}`,
      );

      return {
        count: response.count ?? 0,
        matches: response.matches ?? [],
      };
    },
    [cacheKey],
    { revalidate: 90 },
  );

  return cachedFetcher();
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await task(items[current]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

type CompetitionFetchOutcome = {
  item: CricketCompetitionFilterItem;
  matches: CricketMatch[];
  failed: boolean;
};

function normalizeFromProviderMatches(
  matches: CricketProviderMatch[],
  dhakaDate: string,
  resolveCompetition: (match: CricketProviderMatch) => CricketCompetitionFilterItem | null,
): CricketMatch[] {
  const normalized = matches
    .filter((match) => isMatchOnDhakaDate(match.time?.trim() || "", dhakaDate))
    .map((match) => {
      const competition = resolveCompetition(match);
      if (!competition) return null;

      return normalizeMatch(match, competition);
    })
    .filter((match): match is CricketMatch => match !== null);

  return Array.from(new Map(normalized.map((match) => [match.id, match])).values()).sort(
    (a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime(),
  );
}

async function fetchCompetitionMatchesForDhakaDate(
  item: CricketCompetitionFilterItem,
  dhakaDate: string,
  utcDates: string[],
): Promise<CompetitionFetchOutcome> {
  if (!item.supported || !item.slug) {
    return { item, matches: [], failed: false };
  }

  try {
    const responses = await Promise.all(utcDates.map((utcDate) => fetchCompetitionFixturesByUtcDate(item.slug, utcDate)));
    const rawMatches = responses.flatMap((response) => response.matches);
    const matchKeySet = new Set(item.matchKeys);

    const matches = normalizeFromProviderMatches(rawMatches, dhakaDate, (match) => {
      const competitionName = match.competition?.trim() || "";
      const key = normalizeKey(competitionName);
      return matchKeySet.has(key) ? item : null;
    });

    return { item, matches, failed: false };
  } catch {
    return { item, matches: [], failed: true };
  }
}

function collectAvailableFormats(matches: CricketMatch[]): CricketFormat[] {
  const formatSet = new Set<CricketFormat>();

  for (const match of matches) {
    if (match.format) {
      formatSet.add(match.format);
    }
  }

  return ["test", "odi", "t20"].filter((format) => formatSet.has(format as CricketFormat)) as CricketFormat[];
}

export function getFallbackCricketOverview(errorNote: string): CricketOverviewData {
  const fallbackDate = getTodayDhakaDate();

  return {
    date: fallbackDate,
    matches: [],
    availableFormats: [],
    competitionCatalog: {
      topInternationalCompetitions: preferredTopInternationalCompetitions.map(createUnsupportedItem),
      topDomesticLeagues: preferredTopDomesticLeagues.map(createUnsupportedItem),
      limitationNote: `Cricket provider data is temporarily unavailable. ${errorNote}`,
    },
    diagnostics: {
      provider: "sportscore",
      timezone: "Asia/Dhaka",
      requestedDhakaDate: fallbackDate,
      queriedUtcDates: getUtcDatesForDhakaDate(fallbackDate),
      supportedCompetitionCount: 0,
      unsupportedCompetitionCount:
        preferredTopInternationalCompetitions.length + preferredTopDomesticLeagues.length,
      failedCompetitionRequests: 1,
      completeness: "partial",
      technicalNotes: [
        "Fallback response generated because SportScore cricket requests failed.",
        "Retry via in-page controls once provider connectivity recovers.",
      ],
    },
  };
}

export async function getCricketOverview(date?: string, competitionId?: string): Promise<CricketOverviewData> {
  const safeDhakaDate = date && isValidDateString(date) ? date : getTodayDhakaDate();
  const catalog = await getCachedCricketCompetitionCatalog();
  const allItems = [...catalog.topInternationalCompetitions, ...catalog.topDomesticLeagues];
  const utcDates = getUtcDatesForDhakaDate(safeDhakaDate);

  const selectedCompetition =
    competitionId && competitionId !== "all"
      ? allItems.find((item) => item.id === competitionId && item.supported) ?? null
      : null;

  let matches: CricketMatch[] = [];
  let failedCompetitionRequests = 0;
  const technicalNotes: string[] = [];

  if (selectedCompetition) {
    try {
      const responses = await Promise.all(
        utcDates.map((utcDate) => fetchCompetitionFixturesByUtcDate(selectedCompetition.slug, utcDate)),
      );
      const rawMatches = responses.flatMap((response) => response.matches);

      matches = normalizeFromProviderMatches(rawMatches, safeDhakaDate, () => selectedCompetition);
      technicalNotes.push(`Competition-specific mode for ${selectedCompetition.name} using slug ${selectedCompetition.slug}.`);
    } catch {
      failedCompetitionRequests = 1;
      technicalNotes.push("Competition-specific request failed.");
    }
  } else {
    const supportedItems = allItems.filter((item) => item.supported);

    const outcomes = await mapWithConcurrency(supportedItems, 2, async (item) =>
      fetchCompetitionMatchesForDhakaDate(item, safeDhakaDate, utcDates),
    );

    failedCompetitionRequests = outcomes.filter((outcome) => outcome.failed).length;
    matches = outcomes
      .flatMap((outcome) => outcome.matches)
      .sort((a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime());

    technicalNotes.push("All-matches mode uses curated competition-specific requests with low concurrency.");
  }

  technicalNotes.push(
    "SportScore cricket fixtures currently provide summary score strings; innings/overs/target details appear only when included in status text.",
  );

  const diagnostics: CricketDiagnostics = {
    provider: "sportscore",
    timezone: "Asia/Dhaka",
    requestedDhakaDate: safeDhakaDate,
    queriedUtcDates: utcDates,
    supportedCompetitionCount: allItems.filter((item) => item.supported).length,
    unsupportedCompetitionCount: allItems.filter((item) => !item.supported).length,
    failedCompetitionRequests,
    completeness: failedCompetitionRequests === 0 ? "complete" : "partial",
    technicalNotes,
  };

  return {
    date: safeDhakaDate,
    matches,
    competitionCatalog: catalog,
    availableFormats: collectAvailableFormats(matches),
    diagnostics,
  };
}
