import type { F1Standings } from "@/lib/f1/types";

export type F1StandingsView = "drivers" | "constructors";

type F1StandingsCardProps = {
  standings: F1Standings | null;
  loading: boolean;
  error: string | null;
  view: F1StandingsView;
  onChangeView: (view: F1StandingsView) => void;
  onRetry: () => void;
  asOf: string | null;
};

function formatPoints(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function F1StandingsCard({ standings, loading, error, view, onChangeView, onRetry, asOf }: F1StandingsCardProps) {
  const viewFailed = standings?.failed.includes(view) ?? false;
  const hasRows = standings ? (view === "drivers" ? standings.drivers.length > 0 : standings.constructors.length > 0) : false;

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5" aria-label="Championship standings">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-stone-900">Championship standings</h3>
          {standings ? (
            <p className="mt-0.5 text-xs text-stone-500">
              {standings.season} season{standings.round ? ` · after round ${standings.round}` : ""}
            </p>
          ) : null}
        </div>

        <div className="flex gap-2" role="tablist" aria-label="Standings type">
          {(["drivers", "constructors"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={view === option}
              onClick={() => onChangeView(option)}
              className={`rounded-full px-3 py-1.5 text-sm transition ${
                view === option
                  ? "bg-stone-900 text-stone-50"
                  : "border border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:text-stone-900"
              }`}
            >
              {option === "drivers" ? "Drivers" : "Constructors"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {loading ? <p className="text-sm text-stone-600">Loading standings…</p> : null}

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Could not load standings. {error}
            <button type="button" onClick={onRetry} className="ml-2 underline underline-offset-2">
              Retry
            </button>
          </div>
        ) : null}

        {!loading && !error && standings && viewFailed ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            The {view} standings could not be loaded right now.
            <button type="button" onClick={onRetry} className="ml-2 underline underline-offset-2">
              Retry
            </button>
          </div>
        ) : null}

        {!loading && !error && standings && !viewFailed && !hasRows ? (
          <p className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
            No {view} standings are published for this season yet.
          </p>
        ) : null}

        {!loading && !error && standings && hasRows && view === "drivers" ? (
          <div className="overflow-x-auto rounded-xl border border-stone-200">
            <table className="w-full min-w-[360px] text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-[0.06em] text-stone-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Pos</th>
                  <th className="px-3 py-2 font-medium">Driver</th>
                  <th className="px-3 py-2 font-medium">Wins</th>
                  <th className="px-3 py-2 text-right font-medium">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {standings.drivers.map((row, index) => (
                  <tr key={`${row.driver.id || "driver"}-${index}`} className="bg-white">
                    <td className="px-3 py-2 font-semibold tabular-nums text-stone-900">{row.position ?? row.positionText ?? "-"}</td>
                    <td className="px-3 py-2">
                      <p className="line-clamp-1 text-sm font-medium text-stone-900">{row.driver.name}</p>
                      {row.teams.length > 0 ? <p className="line-clamp-1 text-xs text-stone-500">{row.teams.join(" / ")}</p> : null}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-stone-600">{row.wins ?? "-"}</td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums text-stone-900">{formatPoints(row.points)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {!loading && !error && standings && hasRows && view === "constructors" ? (
          <div className="overflow-x-auto rounded-xl border border-stone-200">
            <table className="w-full min-w-[360px] text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-[0.06em] text-stone-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Pos</th>
                  <th className="px-3 py-2 font-medium">Constructor</th>
                  <th className="px-3 py-2 font-medium">Wins</th>
                  <th className="px-3 py-2 text-right font-medium">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {standings.constructors.map((row, index) => (
                  <tr key={`${row.team.id || "team"}-${index}`} className="bg-white">
                    <td className="px-3 py-2 font-semibold tabular-nums text-stone-900">{row.position ?? row.positionText ?? "-"}</td>
                    <td className="px-3 py-2 text-sm font-medium text-stone-900">{row.team.name}</td>
                    <td className="px-3 py-2 tabular-nums text-stone-600">{row.wins ?? "-"}</td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums text-stone-900">{formatPoints(row.points)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {asOf ? <p className="text-xs text-stone-500">Standings data as of {asOf} (Dhaka).</p> : null}
      </div>
    </section>
  );
}
