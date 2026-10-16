export type BasketballMatchStatus =
  | "live"
  | "upcoming"
  | "finished"
  | "postponed"
  | "cancelled"
  | "abandoned"
  | "delayed"
  | "suspended"
  | "unknown";

export type BasketballMatchFilterStatus = "all" | "live" | "upcoming" | "finished";

export type BasketballProviderMatch = {
  home?: string;
  away?: string;
  home_logo?: string;
  away_logo?: string;
  home_score?: string | number | null;
  away_score?: string | number | null;
  status?: string;
  status_text?: string;
  time?: string;
  competition?: string;
  competition_logo?: string;
  url?: string;
};

export type BasketballCompetitionTarget = {
  key: string;
  label: string;
  searchQuery: string;
  aliases: string[];
  section: "us" | "europe" | "international";
  providerSlug?: string;
  verified: boolean;
  supportNote?: string;
};

export type BasketballCompetitionFilterItem = {
  key: string;
  id: string;
  name: string;
  logoUrl: string;
  slug: string;
  matchKeys: string[];
  supported: boolean;
  supportNote?: string;
  section: "us" | "europe" | "international";
};

export type BasketballCompetitionCatalog = {
  usCompetitions: BasketballCompetitionFilterItem[];
  europeCompetitions: BasketballCompetitionFilterItem[];
  internationalCompetitions: BasketballCompetitionFilterItem[];
  limitationNote: string;
};

export type BasketballMatch = {
  id: string;
  url: string;
  homeTeam: {
    name: string;
    logoUrl: string;
    score: string;
  };
  awayTeam: {
    name: string;
    logoUrl: string;
    score: string;
  };
  status: BasketballMatchStatus;
  statusText: string;
  kickoffUtc: string;
  competition: {
    id: string;
    name: string;
    logoUrl: string;
    key: string;
  };
  gamePhase: {
    label: string;
    isLivePhase: boolean;
  };
};

export type BasketballDiagnostics = {
  provider: "sportscore";
  timezone: "Asia/Dhaka";
  requestedDhakaDate: string;
  queriedUtcDates: string[];
  supportedCompetitionCount: number;
  unsupportedCompetitionCount: number;
  failedCompetitionRequests: number;
  completeness: "complete" | "partial";
  technicalNotes: string[];
};

export type BasketballOverviewData = {
  date: string;
  matches: BasketballMatch[];
  competitionCatalog: BasketballCompetitionCatalog;
  diagnostics: BasketballDiagnostics;
};
