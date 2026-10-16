import Link from "next/link";
import { CircleDot } from "lucide-react";
import { EntityLogo } from "@/components/football/entity-logo";
import type { CricketFormat, CricketMatch } from "@/lib/cricket/types";

function formatKickoff(value: string): string {
  if (!value) {
    return "Start time unavailable";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Start time unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Dhaka",
    timeZoneName: "short",
  }).format(date);
}

function formatLabel(format: CricketFormat | null): string {
  if (format === "test") return "Test";
  if (format === "odi") return "ODI";
  if (format === "t20") return "T20";
  return "Format N/A";
}

function statusBadgeClasses(status: CricketMatch["status"]): string {
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

function buildCricketNote(match: CricketMatch): string | null {
  const normalized = match.statusText.toLowerCase();
  if (/(target|required run rate|required rr|need \d+ runs|chase)/.test(normalized)) {
    return match.statusText;
  }

  if (/innings|stumps|day \d/.test(normalized)) {
    return match.statusText;
  }

  return null;
}

export function CricketMatchCard({ match }: { match: CricketMatch }) {
  const wrapperClass =
    "rounded-2xl border border-stone-200 bg-white p-4 sm:p-5" +
    (match.url ? " transition hover:border-stone-300" : "");

  const note = buildCricketNote(match);

  const content = (
    <article className={wrapperClass}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <EntityLogo src={match.competition.logoUrl} alt={`${match.competition.name} logo`} size={22} />
          <p className="line-clamp-1 text-sm font-medium text-stone-800">{match.competition.name}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-1 text-[11px] font-medium text-stone-700">
            {formatLabel(match.format)}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${statusBadgeClasses(match.status)}`}
          >
            {match.status === "live" ? <CircleDot className="h-3 w-3" /> : null}
            {match.statusText}
          </span>
        </div>
      </header>

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <EntityLogo src={match.homeTeam.logoUrl} alt={`${match.homeTeam.name} crest`} size={24} />
            <p className="line-clamp-1 text-sm text-stone-900 sm:text-base">{match.homeTeam.name}</p>
          </div>
          <p className="text-base font-semibold tabular-nums text-stone-900 sm:text-lg">{match.homeTeam.score}</p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <EntityLogo src={match.awayTeam.logoUrl} alt={`${match.awayTeam.name} crest`} size={24} />
            <p className="line-clamp-1 text-sm text-stone-900 sm:text-base">{match.awayTeam.name}</p>
          </div>
          <p className="text-base font-semibold tabular-nums text-stone-900 sm:text-lg">{match.awayTeam.score}</p>
        </div>
      </div>

      {note ? <p className="mt-3 text-xs text-stone-700">{note}</p> : null}

      <footer className="mt-4 border-t border-stone-100 pt-3 text-xs text-stone-600">{formatKickoff(match.kickoffUtc)} (Dhaka)</footer>
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
      aria-label={`Open cricket match detail for ${match.homeTeam.name} vs ${match.awayTeam.name}`}
    >
      {content}
    </Link>
  );
}
