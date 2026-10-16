import "server-only";

import { unstable_cache } from "next/cache";
import { preferredBasketballCompetitions } from "@/lib/basketball/preferred-competitions";
import type {
  BasketballCompetitionCatalog,
  BasketballCompetitionFilterItem,
  BasketballCompetitionTarget,
  BasketballDiagnostics,
  BasketballMatch,
  BasketballMatchStatus,
  BasketballOverviewData,
  BasketballProviderMatch,
} from "@/lib/basketball/types";

const SPORTSCORE_BASE_URL = "https://sportscore.com";
const BASKETBALL_SPORT = "basketball";
const DHAKA_TIMEZONE = "Asia/Dhaka";
const SPORTSC0RE_MAX_DAY_LIMIT = 200;

type SportScoreFixturesResponse = {
  date?: string;
  count?: number;
  matches?: BasketballProviderMatch[];
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

function parseMatchId(match: BasketballProviderMatch): string {
  const url = match.url?.trim() ?? "";
  if (!url) {
    return `${slugify(match.home ?? "home")}-${slugify(match.away ?? "away")}-${match.time ?? "time"}`;
  }

  const segments = url.split("/").filter(Boolean);
  return segments.at(-1) ?? url;
}

function parseStatusFromText(text?: string): BasketballMatchStatus {
  const normalized = normalizeKey(text ?? "");

  if (!normalized) return "unknown";
  if (normalized.includes("postpon")) return "postponed";
  if (normalized.includes("cancel")) return "cancelled";
  if (normalized.includes("abandon")) return "abandoned";
  if (normalized.includes("delay")) return "delayed";
  if (normalized.includes("suspend")) return "suspended";
  if (
    normalized.includes("quarter") ||
    normalized.includes("period") ||
    normalized.includes("half") ||
    normalized.includes("overtime") ||
    normalized.includes("ot") ||
    normalized.includes("live")
  ) {
    return "live";
  }
  if (normalized.includes("finish") || normalized.includes("final") || normalized.includes("ended")) {
    return "finished";
  }

  if (
    normalized.includes("upcoming") ||
    normalized.includes("scheduled") ||
    normalized.includes("to be determined") ||
    normalized.includes("not started")
  ) {
    return "upcoming";
  }

  return "unknown";
}

function toMatchStatus(rawStatus?: string, rawStatusText?: string): BasketballMatchStatus {
  if (rawStatus === "live" || rawStatus === "upcoming" || rawStatus === "finished") {
    return rawStatus;
  }

  return parseStatusFromText(rawStatusText);
}

function normalizeGamePhase(statusText: string, status: BasketballMatchStatus): { label: string; isLivePhase: boolean } {
  const normalizedText = normalizeKey(statusText);

  if (status === "live") {
    if (normalizedText.includes("1st quarter")) return { label: "Q1", isLivePhase: true };
    if (normalizedText.includes("2nd quarter")) return { label: "Q2", isLivePhase: true };
    if (normalizedText.includes("3rd quarter")) return { label: "Q3", isLivePhase: true };
    if (normalizedText.includes("4th quarter")) return { label: "Q4", isLivePhase: true };
    if (normalizedText.includes("half") || normalizedText.includes("halftime")) {
      return { label: "Halftime", isLivePhase: true };
    }
    if (normalizedText.includes("overtime") || normalizedText.includes("ot")) {
      return { label: "Overtime", isLivePhase: true };
    }

    return { label: statusText || "Live", isLivePhase: true };
  }

  if (status === "finished") {
    return { label: "Final", isLivePhase: false };
  }

  return { label: statusText || "Scheduled", isLivePhase: false };
}

function normalizeMatch(raw: BasketballProviderMatch, competition: BasketballCompetitionFilterItem): BasketballMatch {
  const rawUrl = raw.url?.trim() || "";
  const resolvedUrl = rawUrl.startsWith("http") ? rawUrl : rawUrl ? `${SPORTSCORE_BASE_URL}${rawUrl}` : "";
  const status = toMatchStatus(raw.status, raw.status_text);
  const statusText = raw.status_text?.trim() || "Scheduled";
  const resolvedCompetitionName = raw.competition?.trim() || competition.name;
  const resolvedCompetitionLogo = raw.competition_logo?.trim() || competition.logoUrl;

  return {
    id: parseMatchId(raw),
    url: resolvedUrl,
    homeTeam: {
      name: raw.home?.trim() || "Home team",
      logoUrl: raw.home_logo?.trim() || "",
      score: raw.home_score === null || raw.home_score === undefined ? "" : String(raw.home_score),
    },
    awayTeam: {
      name: raw.away?.trim() || "Away team",
      logoUrl: raw.away_logo?.trim() || "",
      score: raw.away_score === null || raw.away_score === undefined ? "" : String(raw.away_score),
    },
    status,
    statusText,
    kickoffUtc: raw.time?.trim() || "",
    competition: {
      id: competition.id,
      name: resolvedCompetitionName,
      logoUrl: resolvedCompetitionLogo,
      key: normalizeKey(resolvedCompetitionName),
    },
    gamePhase: normalizeGamePhase(statusText, status),
  };
}

async function fetchSportScoreJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    next: { revalidate: 60 },
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`SportScore basketball request failed (${response.status}): ${body.slice(0, 120)}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const body = await response.text();
    throw new Error(`SportScore returned non-JSON response: ${body.slice(0, 120)}`);
  }

  return (await response.json()) as T;
}

function toCatalogItem(target: BasketballCompetitionTarget): BasketballCompetitionFilterItem {
  return {
    key: target.key,
    id: target.key,
    name: target.label,
    logoUrl: "",
    slug: target.providerSlug ?? "",
    matchKeys: [target.label, ...target.aliases].map(normalizeKey),
    supported: Boolean(target.providerSlug && target.verified),
    supportNote: target.supportNote,
    section: target.section,
  };
}

function toFallbackCatalogItem(target: BasketballCompetitionTarget, errorNote: string): BasketballCompetitionFilterItem {
  return {
    ...toCatalogItem(target),
    supported: false,
    supportNote: errorNote,
  };
}

const getCachedBasketballCompetitionCatalog = unstable_cache(
  async (): Promise<BasketballCompetitionCatalog> => {
    const resolved = preferredBasketballCompetitions.map(toCatalogItem);

    return {
      usCompetitions: resolved.filter((item) => item.section === "us"),
      europeCompetitions: resolved.filter((item) => item.section === "europe"),
      internationalCompetitions: resolved.filter((item) => item.section === "international"),
      limitationNote:
        "Curated basketball filters use verified SportScore competition slugs from integration audit. Seasonal competitions can still return no fixtures on many dates.",
    };
  },
  ["basketball-curated-competition-catalog-v2"],
  { revalidate: 60 * 60 * 6 },
);

function collectCatalogItems(catalog: BasketballCompetitionCatalog): BasketballCompetitionFilterItem[] {
  return [...catalog.usCompetitions, ...catalog.europeCompetitions, ...catalog.internationalCompetitions];
}

async function fetchGlobalFixturesByUtcDate(utcDate: string): Promise<{ count: number; matches: BasketballProviderMatch[] }> {
  const cacheKey = `sportscore-basketball-global-${utcDate}`;

  const cachedFetcher = unstable_cache(
    async () => {
      const params = new URLSearchParams({
        sport: BASKETBALL_SPORT,
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
    { revalidate: 60 },
  );

  return cachedFetcher();
}

async function fetchCompetitionFixturesByUtcDate(
  competitionSlug: string,
  utcDate: string,
): Promise<{ count: number; matches: BasketballProviderMatch[] }> {
  const cacheKey = `sportscore-basketball-${competitionSlug}-${utcDate}`;

  const cachedFetcher = unstable_cache(
    async () => {
      const params = new URLSearchParams({
        sport: BASKETBALL_SPORT,
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
    { revalidate: 60 },
  );

  return cachedFetcher();
}

function normalizeFromProviderMatches(
  matches: BasketballProviderMatch[],
  dhakaDate: string,
  resolveCompetition: (match: BasketballProviderMatch) => BasketballCompetitionFilterItem | null,
): BasketballMatch[] {
  const normalized = matches
    .filter((match) => isMatchOnDhakaDate(match.time?.trim() || "", dhakaDate))
    .map((match) => {
      const competition = resolveCompetition(match);
      if (!competition) return null;
      return normalizeMatch(match, competition);
    })
    .filter((match): match is BasketballMatch => match !== null);

  return Array.from(new Map(normalized.map((match) => [match.id, match])).values()).sort(
    (a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime(),
  );
}

function resolveCatalogItemForMatch(
  match: BasketballProviderMatch,
  items: BasketballCompetitionFilterItem[],
): BasketballCompetitionFilterItem | null {
  const competitionName = match.competition?.trim() || "";
  const key = normalizeKey(competitionName);

  return items.find((item) => item.supported && item.matchKeys.includes(key)) ?? null;
}

function getFallbackCompetitionCatalog(errorNote: string): BasketballCompetitionCatalog {
  const fallbackItems = preferredBasketballCompetitions.map((target) => toFallbackCatalogItem(target, errorNote));

  return {
    usCompetitions: fallbackItems.filter((item) => item.section === "us"),
    europeCompetitions: fallbackItems.filter((item) => item.section === "europe"),
    internationalCompetitions: fallbackItems.filter((item) => item.section === "international"),
    limitationNote: `Basketball provider data is temporarily unavailable. ${errorNote}`,
  };
}

export function getFallbackBasketballOverview(errorNote: string): BasketballOverviewData {
  const fallbackDate = getTodayDhakaDate();
  const fallbackCatalog = getFallbackCompetitionCatalog(errorNote);

  return {
    date: fallbackDate,
    matches: [],
    competitionCatalog: fallbackCatalog,
    diagnostics: {
      provider: "sportscore",
      timezone: "Asia/Dhaka",
      requestedDhakaDate: fallbackDate,
      queriedUtcDates: getUtcDatesForDhakaDate(fallbackDate),
      supportedCompetitionCount: 0,
      unsupportedCompetitionCount: collectCatalogItems(fallbackCatalog).length,
      failedCompetitionRequests: 1,
      completeness: "partial",
      technicalNotes: [
        "Fallback response generated because SportScore basketball requests failed.",
        "Retry via page controls when provider connectivity recovers.",
      ],
    },
  };
}

export async function getBasketballOverview(date?: string, competitionId?: string): Promise<BasketballOverviewData> {
  const safeDhakaDate = date && isValidDateString(date) ? date : getTodayDhakaDate();
  const catalog = await getCachedBasketballCompetitionCatalog();
  const catalogItems = collectCatalogItems(catalog);
  const utcDates = getUtcDatesForDhakaDate(safeDhakaDate);

  const selectedCompetition =
    competitionId && competitionId !== "all"
      ? catalogItems.find((item) => item.id === competitionId && item.supported) ?? null
      : null;

  let matches: BasketballMatch[] = [];
  let failedCompetitionRequests = 0;
  let likelyTruncated = false;
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
      technicalNotes.push("Competition-specific basketball request failed.");
    }
  } else {
    try {
      const responses = await Promise.all(utcDates.map((utcDate) => fetchGlobalFixturesByUtcDate(utcDate)));
      const rawMatches = responses.flatMap((response) => response.matches);
      likelyTruncated = responses.some((response) => response.count >= SPORTSC0RE_MAX_DAY_LIMIT);

      matches = normalizeFromProviderMatches(rawMatches, safeDhakaDate, (match) =>
        resolveCatalogItemForMatch(match, catalogItems),
      );

      if (likelyTruncated) {
        technicalNotes.push(
          "Global basketball date feed reached provider limit (200) on at least one UTC day; all-competitions completeness may be reduced.",
        );
      }

      technicalNotes.push("All-competitions mode uses global date feed and maps curated competitions.");
    } catch {
      failedCompetitionRequests = 1;
      technicalNotes.push("Global basketball date-feed request failed.");
    }
  }

  technicalNotes.push(
    "SportScore basketball detail endpoint currently returns limited quarter-by-quarter stats in many fixtures; UI shows only confirmed fields.",
  );

  return {
    date: safeDhakaDate,
    matches,
    competitionCatalog: catalog,
    diagnostics: {
      provider: "sportscore",
      timezone: "Asia/Dhaka",
      requestedDhakaDate: safeDhakaDate,
      queriedUtcDates: utcDates,
      supportedCompetitionCount: catalogItems.filter((item) => item.supported).length,
      unsupportedCompetitionCount: catalogItems.filter((item) => !item.supported).length,
      failedCompetitionRequests,
      completeness: failedCompetitionRequests === 0 && !likelyTruncated ? "complete" : "partial",
      technicalNotes,
    },
  };
}
