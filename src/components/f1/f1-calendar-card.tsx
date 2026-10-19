import { formatDhakaDateTime, formatPlainDate, getWeekendStatus, type WeekendStatus } from "@/lib/f1/schedule-utils";
import type { F1Race } from "@/lib/f1/types";

type F1CalendarCardProps = {
  season: string;
  races: F1Race[];
  selectedRound: number | null;
  nowMs: number;
  onSelectRound: (round: number) => void;
};

const statusLabel: Record<WeekendStatus, string> = {
  upcoming: "Upcoming",
  in_progress: "Under way",
  completed: "Completed",
};

export function F1CalendarCard({ season, races, selectedRound, nowMs, onSelectRound }: F1CalendarCardProps) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5" aria-label="Race calendar">
      <h3 className="text-base font-semibold text-stone-900">{season} race calendar</h3>
      <p className="mt-1 text-xs text-stone-500">Select a round to see its schedule and results. Dates in Asia/Dhaka.</p>

      <ul className="mt-4 max-h-[420px] divide-y divide-stone-100 overflow-y-auto rounded-xl border border-stone-200">
        {races.map((race) => {
          const selected = race.round === selectedRound;
          const status = getWeekendStatus(race, nowMs);
          const date = race.raceStartUtc ? formatDhakaDateTime(race.raceStartUtc).day : formatPlainDate(race.raceDate);

          return (
            <li key={race.round}>
              <button
                type="button"
                onClick={() => onSelectRound(race.round)}
                aria-pressed={selected}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${
                  selected ? "bg-[#fdebe9]" : "bg-white hover:bg-stone-50"
                }`}
              >
                <span className="w-7 shrink-0 text-xs font-semibold tabular-nums text-stone-500">R{race.round}</span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-1 block text-sm font-medium text-stone-900">{race.name}</span>
                  <span className="line-clamp-1 block text-xs text-stone-500">
                    {date}
                    {race.isSprintWeekend ? " · Sprint weekend" : ""}
                  </span>
                </span>
                <span className="shrink-0 text-[11px] text-stone-500">{statusLabel[status]}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
