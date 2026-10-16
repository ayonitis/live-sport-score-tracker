import Link from "next/link";
import { CircleDot } from "lucide-react";
import { EntityLogo } from "@/components/football/entity-logo";
import type { BasketballMatch } from "@/lib/basketball/types";

function formatTipoff(value: string): string {
  if (!value) {
    return "Tip-off time unavailable";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Tip-off time unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Dhaka",
    timeZoneName: "short",
  }).format(date);
}

function statusBadgeClasses(status: BasketballMatch["status"]): string {
  if (status === "live") return "border-red-200 bg-red-50 text-red-700";
  if (status === "upcoming") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "finished") return "border-stone-300 bg-stone-100 text-stone-700";
  if (status === "delayed" || status === "postponed" || status === "suspended") {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }
  if (status === "cancelled" || status === "abandoned") {
    return "border-zinc-300 bg-zinc-100 text-zinc-700";
  }

  return "border-stone-300 bg-stone-100 text-stone-700";
}

function scoreValue(score: string): string {
  return score.trim() ? score : "—";
}

export function BasketballMatchCard({ match }: { match: BasketballMatch }) {
  const showScores = match.status !== "upcoming" && (match.homeTeam.score || match.awayTeam.score);

  const wrapperClass =
    "rounded-2xl border border-stone-200 bg-white p-4 sm:p-5" +
    (match.url ? " transition hover:border-stone-300" : "");

  const content = (
    <article className={wrapperClass}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <EntityLogo src={match.competition.logoUrl} alt={`${match.competition.name} logo`} size={22} />
          <p className="line-clamp-1 text-sm font-medium text-stone-800">{match.competition.name}</p>
        </div>

        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${statusBadgeClasses(match.status)}`}
        >
          {match.status === "live" ? <CircleDot className="h-3 w-3" /> : null}
          {match.gamePhase.label}
        </span>
      </header>

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <EntityLogo src={match.homeTeam.logoUrl} alt={`${match.homeTeam.name} logo`} size={24} />
            <p className="line-clamp-1 text-sm text-stone-900 sm:text-base">{match.homeTeam.name}</p>
          </div>
          <p className="text-base font-semibold tabular-nums text-stone-900 sm:text-lg">
            {showScores ? scoreValue(match.homeTeam.score) : ""}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <EntityLogo src={match.awayTeam.logoUrl} alt={`${match.awayTeam.name} logo`} size={24} />
            <p className="line-clamp-1 text-sm text-stone-900 sm:text-base">{match.awayTeam.name}</p>
          </div>
          <p className="text-base font-semibold tabular-nums text-stone-900 sm:text-lg">
            {showScores ? scoreValue(match.awayTeam.score) : ""}
          </p>
        </div>
      </div>

      <footer className="mt-4 border-t border-stone-100 pt-3 text-xs text-stone-600">
        {showScores ? match.statusText : `Scheduled: ${formatTipoff(match.kickoffUtc)} (Dhaka)`}
      </footer>
    </article>
  );

  if (!match.url) {
    return content;
  }

  return (
    <Link
      href={match.url}
      target="_blank"
      rel="noreferrer"
      aria-label={`Open basketball match detail for ${match.homeTeam.name} vs ${match.awayTeam.name}`}
    >
      {content}
    </Link>
  );
}
