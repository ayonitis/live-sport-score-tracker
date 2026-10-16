import type { PreferredCricketCompetitionTarget } from "@/lib/cricket/types";

export const preferredTopInternationalCompetitions: PreferredCricketCompetitionTarget[] = [
  {
    key: "icc-cricket-world-cup",
    label: "ICC Cricket World Cup",
    searchQuery: "ICC Cricket World Cup",
    aliases: ["ICC Cricket World Cup"],
  },
  {
    key: "icc-mens-t20-world-cup",
    label: "ICC T20 World Cup",
    searchQuery: "ICC Men's T20 World Cup",
    aliases: ["ICC Men's T20 World Cup", "ICC T20 World Cup"],
  },
  {
    key: "icc-world-test-championship",
    label: "ICC World Test Championship",
    searchQuery: "ICC World Test Championship",
    aliases: ["ICC World Test Championship"],
  },
  {
    key: "asia-cup",
    label: "Asia Cup",
    searchQuery: "Asia Cup",
    aliases: ["Asia Cup", "ACC Asia Cup"],
  },
  {
    key: "icc-champions-trophy",
    label: "ICC Champions Trophy",
    searchQuery: "ICC Champions Trophy",
    aliases: ["ICC Champions Trophy"],
  },
  {
    key: "international-bilateral-series",
    label: "International bilateral series",
    searchQuery: "ODI Series",
    aliases: ["ODI Series", "T20I Series", "Test Series"],
  },
];

export const preferredTopDomesticLeagues: PreferredCricketCompetitionTarget[] = [
  {
    key: "indian-premier-league",
    label: "Indian Premier League",
    searchQuery: "Indian Premier League",
    aliases: ["Indian Premier League", "IPL"],
  },
  {
    key: "bangladesh-premier-league",
    label: "Bangladesh Premier League",
    searchQuery: "Bangladesh Premier League",
    aliases: ["Bangladesh Premier League", "BPL"],
  },
  {
    key: "pakistan-super-league",
    label: "Pakistan Super League",
    searchQuery: "Pakistan Super League",
    aliases: ["Pakistan Super League", "PSL"],
  },
  {
    key: "big-bash-league",
    label: "Big Bash League",
    searchQuery: "Big Bash League",
    aliases: ["Big Bash League", "BBL"],
  },
  {
    key: "the-hundred",
    label: "The Hundred",
    searchQuery: "The Hundred",
    aliases: ["The Hundred"],
  },
  {
    key: "major-domestic-supported",
    label: "Major domestic competitions",
    searchQuery: "CSA T20 Challenge",
    aliases: ["CSA T20 Challenge", "County Championship", "Sheffield Shield"],
  },
];
