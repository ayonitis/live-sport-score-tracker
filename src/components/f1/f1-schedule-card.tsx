import { formatDhakaDateTime, getSessionStatus, sessionHasResultsKey, type SessionStatus } from "@/lib/f1/schedule-utils";
import type { F1Race, F1RoundResults } from "@/lib/f1/types";

type F1ScheduleCardProps = {
  race: F1Race;
  results: F1RoundResults | null;
  nowMs: number;
};

const statusStyles: Record<SessionStatus, { label: string; classes: string }> = {
  upcoming: { label: "Upcoming", classes: "border-amber-200 bg-amber-50 text-amber-700" },
  started: { label: "Started", classes: "border-red-200 bg-red-50 text-red-700" },
  past: { label: "Past", classes: "border-stone-300 bg-stone-100 text-stone-700" },
  results: { label: "Results in", classes: "border-emerald-200 bg-emerald-50 text-emerald-700" },
};

function sessionHasResults(key: F1Race["sessions"][number]["key"], results: F1RoundResults | null): boolean {
  if (!results || !sessionHasResultsKey(key)) return false;
  if (key === "race") return results.race.length > 0;
  if (key === "sprint") return results.sprint.length > 0;
  return results.qualifying.length > 0;
}

export function F1ScheduleCard({ race, results, nowMs }: F1ScheduleCardProps) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5" aria-label="Weekend schedule">
      <h3 className="text-base font-semibold text-stone-900">Weekend schedule</h3>
      <p className="mt-1 text-xs text-stone-500">Times shown in Asia/Dhaka. Only sessions published for this weekend are listed.</p>

      {race.sessions.length === 0 ? (
        <p className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
          Session times are not published for this round by the data source.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200">
          {race.sessions.map((session) => {
            const when = formatDhakaDateTime(session.startUtc);
            const status = getSessionStatus(session, nowMs, sessionHasResults(session.key, results));
            const isRace = session.key === "race";

            return (
              <li key={`${session.key}-${session.startUtc}`} className={`flex items-center justify-between gap-3 px-3 py-2.5 ${isRace ? "bg-[#fdebe9]" : "bg-white"}`}>
                <div className="min-w-0">
                  <p className={`text-sm ${isRace ? "font-semibold" : "font-medium"} text-stone-900`}>{session.label}</p>
                  <p className="text-xs text-stone-600" title={`${session.startUtc} (UTC)`}>
                    {when.day} · {when.time}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${statusStyles[status].classes}`}>
                  {statusStyles[status].label}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs leading-5 text-stone-600">
        Live timing is not available from this data source, so there is no live leaderboard. Session status comes from the published
        start times and whether results have been published: &quot;Started&quot; only means the start time has passed.
      </p>
    </section>
  );
}
