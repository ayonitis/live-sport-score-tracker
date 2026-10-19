export type F1SessionKey =
  | "fp1"
  | "fp2"
  | "fp3"
  | "sprintQualifying"
  | "sprintShootout"
  | "sprint"
  | "qualifying"
  | "race";

export type F1Session = {
  key: F1SessionKey;
  label: string;
  /** ISO 8601 UTC start time, exactly as published by the provider. */
  startUtc: string;
};

export type F1Race = {
  season: string;
  round: number;
  name: string;
  circuitName: string;
  locality: string;
  country: string;
  /** Race date (yyyy-mm-dd) as published. */
  raceDate: string;
  /** Race start in UTC, or null when the provider publishes no start time (older seasons). */
  raceStartUtc: string | null;
  /** Only sessions the provider actually publishes, in chronological order (includes the race when its time is known). */
  sessions: F1Session[];
  isSprintWeekend: boolean;
};

export type F1Calendar = {
  season: string;
  races: F1Race[];
  fetchedAt: string;
};

export type F1Driver = {
  id: string;
  code: string;
  name: string;
  number: string;
};

export type F1Team = {
  id: string;
  name: string;
};

export type F1RaceResultRow = {
  position: number | null;
  /** Provider position text: a number, or R, D, W, N, E, F for non-classified results. */
  positionText: string;
  driver: F1Driver;
  team: F1Team;
  grid: number | null;
  laps: number | null;
  /** Total time for the winner or the gap for others, when the provider supplies it. */
  timeOrGap: string | null;
  status: string;
  points: number | null;
  fastestLapTime: string | null;
};

export type F1QualifyingRow = {
  position: number | null;
  driver: F1Driver;
  team: F1Team;
  q1: string | null;
  q2: string | null;
  q3: string | null;
};

export type F1ResultSessionKind = "race" | "qualifying" | "sprint";

export type F1RoundResults = {
  season: string;
  round: number;
  raceName: string;
  race: F1RaceResultRow[];
  sprint: F1RaceResultRow[];
  qualifying: F1QualifyingRow[];
  /** Sessions whose request failed (as opposed to returning no data yet). */
  failedSessions: F1ResultSessionKind[];
  fetchedAt: string;
};

export type F1DriverStanding = {
  position: number | null;
  positionText: string;
  points: number;
  wins: number | null;
  driver: F1Driver;
  teams: string[];
};

export type F1ConstructorStanding = {
  position: number | null;
  positionText: string;
  points: number;
  wins: number | null;
  team: F1Team;
};

export type F1Standings = {
  season: string;
  /** Round the standings are current to, when the provider says. */
  round: number | null;
  drivers: F1DriverStanding[];
  constructors: F1ConstructorStanding[];
  failed: Array<"drivers" | "constructors">;
  fetchedAt: string;
};

export type F1InitialData = {
  /** Server time (ms since epoch) used for the first render so server and client agree. */
  generatedAt: number;
  season: string | null;
  calendar: F1Calendar | null;
  calendarError: string | null;
  eventRound: number | null;
  resultsRound: number | null;
  results: F1RoundResults | null;
  resultsError: string | null;
  standings: F1Standings | null;
  standingsError: string | null;
};
