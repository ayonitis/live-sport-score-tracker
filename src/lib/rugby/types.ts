export type RugbyMatchStatus =
  | "live"
  | "upcoming"
  | "finished"
  | "postponed"
  | "cancelled"
  | "abandoned"
  | "suspended"
  | "unknown";

export type RugbyMatchFilterStatus = "all" | "live" | "upcoming" | "finished";

/** Subset of the API-Sports Rugby `/games` response that LivePulse reads. Every field is optional on purpose. */
export type RugbyProviderScorePair = {
  home?: number | string | null;
  away?: number | string | null;
};

export type RugbyProviderGame = {
  id?: number | string;
  date?: string | null;
  time?: string | null;
  timestamp?: number | string | null;
  timezone?: string | null;
  week?: string | number | null;
  status?: {
    long?: string | null;
    short?: string | null;
  } | null;
  country?: {
    id?: number | string;
    name?: string | null;
    code?: string | null;
    flag?: string | null;
  } | null;
  league?: {
    id?: number | string;
    name?: string | null;
    type?: string | null;
    logo?: string | null;
    season?: number | string | null;
  } | null;
  teams?: {
    home?: { id?: number | string; name?: string | null; logo?: string | null } | null;
    away?: { id?: number | string; name?: string | null; logo?: string | null } | null;
  } | null;
  scores?: RugbyProviderScorePair | null;
  periods?: {
    first?: RugbyProviderScorePair | null;
    second?: RugbyProviderScorePair | null;
    overtime?: RugbyProviderScorePair | null;
    second_overtime?: RugbyProviderScorePair | null;
  } | null;
};

export type RugbyProviderLeague = {
  id?: number | string;
  name?: string | null;
  type?: string | null;
  logo?: string | null;
  country?: { id?: number | string; name?: string | null; code?: string | null; flag?: string | null } | null;
  seasons?: Array<{
    season?: number | string | null;
    current?: boolean | null;
    start?: string | null;
    end?: string | null;
  }> | null;
};

export type RugbyMatch = {
  id: string;
  url: string;
  homeTeam: {
    name: string;
    logoUrl: string;
  };
  awayTeam: {
    name: string;
    logoUrl: string;
  };
  homeScore: string;
  awayScore: string;
  status: RugbyMatchStatus;
  statusText: string;
  kickoffUtc: string;
  /** Half-time score, only when the provider supplies it (for example "12-7"). */
  halfTimeScore: string | null;
  /** Extra-time score, only when the provider supplies it. */
  extraTimeScore: string | null;
  competition: {
    id: string;
    name: string;
    logoUrl: string;
    key: string;
    countryName: string;
  };
};

export type PreferredRugbyCompetitionTarget = {
  key: string;
  label: string;
  /** Names the provider might use for this competition. */
  aliases: string[];
  /** Provider country/region used to tell apart competitions that share a name (e.g. "Premiership"). */
  country: string;
};

export type RugbyCompetitionFilterItem = {
  key: string;
  id: string;
  name: string;
  logoUrl: string;
  countryName: string;
  supported: boolean;
  supportNote?: string;
};

export type RugbyCompetitionCatalog = {
  internationalCompetitions: RugbyCompetitionFilterItem[];
  clubCompetitions: RugbyCompetitionFilterItem[];
  limitationNote: string;
};

export type RugbyDiagnostics = {
  provider: "api-sports";
  timezone: "Asia/Dhaka";
  requestedDhakaDate: string;
  queriedUtcDates: string[];
  failedRequests: number;
  completeness: "complete" | "partial";
  technicalNotes: string[];
};

export type RugbyOverviewData = {
  date: string;
  matches: RugbyMatch[];
  competitionCatalog: RugbyCompetitionCatalog;
  /** Competitions playing on this date that are not in the curated catalog. Derived from real fixtures. */
  otherCompetitions: RugbyCompetitionFilterItem[];
  /** ISO timestamp of the oldest provider response used to build this view. */
  dataAsOf: string | null;
  diagnostics: RugbyDiagnostics;
  /** Set when the provider could not be reached or is not configured. Matches are empty in that case. */
  providerError: string | null;
};
