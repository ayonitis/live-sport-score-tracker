import { CircleDot } from "lucide-react";
import type { RugbyMatch } from "@/lib/rugby/types";
import { EntityLogo } from "@/components/football/entity-logo";

function formatKickoff(value: string): string {
  if (!value) {
    return "Kick-off time unavailable";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Kick-off time unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Dhaka",
    timeZoneName: "short",
  }).format(date);
}

function statusBadgeClasses(status: RugbyMatch["status"]): string {
  if (status === "live") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (status === "finished") {
    return "border-stone-300 bg-stone-100 text-stone-700";
  }

  if (status === "upcoming") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "postponed" || status === "suspended") {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }

  if (status === "cancelled" || status === "abandoned") {
    return "border-zinc-300 bg-zinc-100 text-zinc-700";
  }

  return "border-stone-300 bg-stone-100 text-stone-700";
}

export function RugbyMatchCard({ match }: { match: RugbyMatch }) {
  const showCountry = match.competition.countryName && match.competition.countryName.toLowerCase() !== "world";

  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <EntityLogo src={match.competition.logoUrl} alt={`${match.competition.name} logo`} size={22} />
          <p className="line-clamp-1 text-sm font-medium text-stone-800">
            {match.competition.name}
            {showCountry ? <span className="font-normal text-stone-500"> · {match.competition.countryName}</span> : null}
          </p>
        </div>

        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${statusBadgeClasses(match.status)}`}
        >
          {match.status === "live" ? <CircleDot className="h-3 w-3" /> : null}
          {match.statusText}
        </span>
      </header>

      <div className="mt-4 grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <EntityLogo src={match.homeTeam.logoUrl} alt={`${match.homeTeam.name} crest`} size={24} />
            <p className="line-clamp-1 text-sm text-stone-900 sm:text-base">{match.homeTeam.name}</p>
          </div>
          <p className="text-lg font-semibold tabular-nums text-stone-900">{match.homeScore}</p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <EntityLogo src={match.awayTeam.logoUrl} alt={`${match.awayTeam.name} crest`} size={24} />
            <p className="line-clamp-1 text-sm text-stone-900 sm:text-base">{match.awayTeam.name}</p>
          </div>
          <p className="text-lg font-semibold tabular-nums text-stone-900">{match.awayScore}</p>
        </div>
      </div>

      <footer className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-stone-100 pt-3 text-xs text-stone-600">
        <span>{formatKickoff(match.kickoffUtc)} (Dhaka)</span>
        {match.halfTimeScore ? <span>Half-time {match.halfTimeScore}</span> : null}
        {match.extraTimeScore ? <span>Extra time {match.extraTimeScore}</span> : null}
      </footer>
    </article>
  );
}
