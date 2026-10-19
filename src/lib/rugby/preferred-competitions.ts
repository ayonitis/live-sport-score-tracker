import type { PreferredRugbyCompetitionTarget } from "@/lib/rugby/types";

/**
 * Curated rugby union competitions. These are only *search targets*: each one is matched against the
 * provider's live `/leagues` metadata, and a competition is shown in the sidebar only when the provider
 * returns a match for it. Nothing here is displayed as-is.
 */
export const preferredInternationalCompetitions: PreferredRugbyCompetitionTarget[] = [
  { key: "six-nations", label: "Six Nations", aliases: ["Six Nations", "Six Nations Championship"], country: "Europe" },
  { key: "rugby-championship", label: "The Rugby Championship", aliases: ["Rugby Championship", "The Rugby Championship"], country: "World" },
  { key: "nations-championship", label: "Nations Championship", aliases: ["Nations Championship"], country: "World" },
  { key: "rugby-world-cup", label: "Rugby World Cup", aliases: ["World Cup", "Rugby World Cup"], country: "World" },
  { key: "sevens-world-cup", label: "Rugby World Cup Sevens", aliases: ["Sevens World Cup", "Rugby World Cup Sevens"], country: "World" },
  { key: "autumn-nations-cup", label: "Autumn Nations Cup", aliases: ["Autumn Nations Cup"], country: "World" },
  { key: "pacific-nations-cup", label: "Pacific Nations Cup", aliases: ["Pacific Nations Cup"], country: "World" },
];

export const preferredClubCompetitions: PreferredRugbyCompetitionTarget[] = [
  {
    key: "united-rugby-championship",
    label: "United Rugby Championship",
    aliases: ["United Rugby Championship", "URC"],
    country: "World",
  },
  { key: "premiership-rugby", label: "Premiership Rugby", aliases: ["Premiership Rugby", "Gallagher Premiership"], country: "England" },
  { key: "top-14", label: "Top 14", aliases: ["Top 14"], country: "France" },
  {
    key: "european-champions-cup",
    label: "European Rugby Champions Cup",
    aliases: ["European Rugby Champions Cup", "Champions Cup"],
    country: "Europe",
  },
  { key: "challenge-cup", label: "EPCR Challenge Cup", aliases: ["Challenge Cup"], country: "Europe" },
  { key: "super-rugby", label: "Super Rugby", aliases: ["Super Rugby", "Super Rugby Pacific"], country: "World" },
  { key: "pro-d2", label: "Pro D2", aliases: ["Pro D2"], country: "France" },
  { key: "currie-cup", label: "Currie Cup", aliases: ["Currie Cup"], country: "South-Africa" },
  { key: "major-league-rugby", label: "Major League Rugby", aliases: ["Major League Rugby"], country: "USA" },
];
