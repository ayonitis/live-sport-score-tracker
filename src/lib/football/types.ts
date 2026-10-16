export type MatchStatus =
  | "live"
  | "upcoming"
  | "finished"
  | "postponed"
  | "cancelled"
  | "abandoned"
  | "suspended"
  | "unknown";

export type MatchFilterStatus = "all" | "live" | "upcoming" | "finished";

export type FootballProviderMatch = {
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

export type FootballMatch = {
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
  status: MatchStatus;
  statusText: string;
  kickoffUtc: string;
  competition: {
    id: string;
    name: string;
    logoUrl: string;
    key: string;
  };
};

export type PreferredCompetitionTarget = {
  key: string;
  label: string;
  searchQuery: string;
  aliases: string[];
};

export type CompetitionFilterItem = {
  key: string;
  id: string;
  name: string;
  logoUrl: string;
  slug: string;
  matchKeys: string[];
  supported: boolean;
  supportNote?: string;
};

export type CompetitionCatalog = {
  topCompetitions: CompetitionFilterItem[];
  topLeagues: CompetitionFilterItem[];
  limitationNote: string;
};

export type DataDiagnostics = {
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

export type FootballOverviewData = {
  date: string;
  matches: FootballMatch[];
  competitionCatalog: CompetitionCatalog;
  diagnostics: DataDiagnostics;
};
