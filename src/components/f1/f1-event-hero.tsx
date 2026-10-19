import { MapPin } from "lucide-react";
import { F1Countdown } from "@/components/f1/f1-countdown";
import { formatDhakaDateTime, formatPlainDate, getNextSession, type WeekendStatus } from "@/lib/f1/schedule-utils";
import type { F1Race } from "@/lib/f1/types";

type F1EventHeroProps = {
  race: F1Race;
  status: WeekendStatus;
  nowMs: number;
  isNextEvent: boolean;
};

const statusStyles: Record<WeekendStatus, { label: string; classes: string }> = {
  upcoming: { label: "Upcoming", classes: "border-amber-200 bg-amber-50 text-amber-700" },
  in_progress: { label: "Race weekend under way", classes: "border-red-200 bg-red-50 text-red-700" },
  completed: { label: "Completed", classes: "border-stone-300 bg-stone-100 text-stone-700" },
};

export function F1EventHero({ race, status, nowMs, isNextEvent }: F1EventHeroProps) {
  const nextSession = status === "completed" ? null : getNextSession(race, nowMs);
  const raceTime = race.raceStartUtc ? formatDhakaDateTime(race.raceStartUtc) : null;
  const place = [race.circuitName, race.locality, race.country].filter(Boolean).join(" · ");

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6" aria-label="Race weekend overview">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#432a2a]">
            {isNextEvent ? "Next race weekend" : "Race weekend"} · Round {race.round} · {race.season} season
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">{race.name}</h2>
          <p className="mt-2 inline-flex items-start gap-1.5 text-sm text-stone-600">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" aria-hidden="true" />
            <span>{place}</span>
          </p>
        </div>

        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyles[status].classes}`}>
          {statusStyles[status].label}
        </span>
      </div>

      <dl className="mt-5 grid gap-4 border-t border-stone-100 pt-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-[0.08em] text-stone-500">Grand Prix start (Dhaka)</dt>
          <dd className="mt-1 text-base font-medium text-stone-900">
            {raceTime ? (
              <>
                {raceTime.day} · {raceTime.time}
              </>
            ) : (
              <>
                {formatPlainDate(race.raceDate)} <span className="text-sm font-normal text-stone-500">(start time not published)</span>
              </>
            )}
          </dd>
        </div>

        <div>
          <dt className="text-xs uppercase tracking-[0.08em] text-stone-500">
            {nextSession ? `Next session: ${nextSession.label}` : "Next session"}
          </dt>
          <dd className="mt-1 text-base font-medium text-stone-900">
            {nextSession ? (
              <F1Countdown targetMs={Date.parse(nextSession.startUtc)} initialNowMs={nowMs} />
            ) : (
              <span className="text-sm font-normal text-stone-500">
                {status === "completed" ? "This weekend has finished." : "No upcoming session times are published."}
              </span>
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}
