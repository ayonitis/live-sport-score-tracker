export type CricketMatchStatus =
  | "live"
  | "upcoming"
  | "finished"
  | "postponed"
  | "cancelled"
  | "abandoned"
  | "delayed"
  | "suspended"
  | "unknown";

export type CricketMatchFilterStatus = "all" | "live" | "upcoming" | "finished";

export type CricketFormat = "test" | "odi" | "t20";

export type CricketProviderMatch = {
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

export type CricketMatch = {
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
  status: CricketMatchStatus;
  statusText: string;
  kickoffUtc: string;
  format: CricketFormat | null;
  competition: {
    id: string;
    name: string;
    logoUrl: string;
    key: string;
  };
};

export type PreferredCricketCompetitionTarget = {
  key: string;
  label: string;
  searchQuery: string;
  aliases: string[];
};

export type CricketCompetitionFilterItem = {
  key: string;
  id: string;
  name: string;
  logoUrl: string;
  slug: string;
  matchKeys: string[];
  supported: boolean;
  supportNote?: string;
};

export type CricketCompetitionCatalog = {
  topInternationalCompetitions: CricketCompetitionFilterItem[];
  topDomesticLeagues: CricketCompetitionFilterItem[];
  limitationNote: string;
};

export type CricketDiagnostics = {
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

export type CricketOverviewData = {
  date: string;
  matches: CricketMatch[];
  competitionCatalog: CricketCompetitionCatalog;
  availableFormats: CricketFormat[];
  diagnostics: CricketDiagnostics;
};
