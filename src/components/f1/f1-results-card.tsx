import type { F1QualifyingRow, F1RaceResultRow, F1ResultSessionKind, F1RoundResults } from "@/lib/f1/types";

type F1ResultsCardProps = {
  results: F1RoundResults | null;
  loading: boolean;
  error: string | null;
  activeTab: F1ResultSessionKind | null;
  availableTabs: F1ResultSessionKind[];
  onSelectTab: (tab: F1ResultSessionKind) => void;
  onRetry: () => void;
  emptyMessage: string;
  jumpLabel: string | null;
  onJump: () => void;
  asOf: string | null;
};

const TAB_LABELS: Record<F1ResultSessionKind, string> = {
  race: "Grand Prix",
  sprint: "Sprint",
  qualifying: "Qualifying",
};

const SESSION_TITLES: Record<F1ResultSessionKind, string> = {
  race: "Grand Prix race result",
  sprint: "Sprint race result",
  qualifying: "Qualifying result",
};

const POSITION_LABELS: Record<string, string> = { R: "RET", D: "DSQ", W: "WD", N: "NC", E: "EX", F: "DNQ" };

function positionLabel(position: number | null, positionText: string): string {
  if (/^\d+$/.test(positionText)) return positionText;
  if (positionText && POSITION_LABELS[positionText]) return POSITION_LABELS[positionText];
  return position !== null ? String(position) : positionText || "-";
}

function formatPoints(value: number | null): string {
  if (value === null) return "-";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function DriverCell({ name, number, team }: { name: string; number: string; team: string }) {
  return (
    <div className="min-w-0">
      <p className="line-clamp-1 text-sm font-medium text-stone-900">
        {name}
        {number ? <span className="ml-1.5 text-xs font-normal text-stone-500">#{number}</span> : null}
      </p>
      <p className="line-clamp-1 text-xs text-stone-500">{team}</p>
    </div>
  );
}

function RaceTable({ rows }: { rows: F1RaceResultRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="bg-stone-50 text-xs uppercase tracking-[0.06em] text-stone-500">
          <tr>
            <th className="px-3 py-2 font-medium">Pos</th>
            <th className="px-3 py-2 font-medium">Driver</th>
            <th className="px-3 py-2 font-medium">Grid</th>
            <th className="px-3 py-2 font-medium">Time / gap</th>
            <th className="px-3 py-2 text-right font-medium">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map((row, index) => (
            <tr key={`${row.driver.id || "driver"}-${index}`} className="bg-white">
              <td className="px-3 py-2 font-semibold tabular-nums text-stone-900" title={row.status}>
                {positionLabel(row.position, row.positionText)}
              </td>
              <td className="px-3 py-2">
                <DriverCell name={row.driver.name} number={row.driver.number} team={row.team.name} />
              </td>
              <td className="px-3 py-2 tabular-nums text-stone-600">{row.grid === null ? "-" : row.grid === 0 ? "Pit" : row.grid}</td>
              <td className="px-3 py-2 tabular-nums text-stone-700">{row.timeOrGap ?? (row.status || "-")}</td>
              <td className="px-3 py-2 text-right font-medium tabular-nums text-stone-900">{formatPoints(row.points)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QualifyingTable({ rows }: { rows: F1QualifyingRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="bg-stone-50 text-xs uppercase tracking-[0.06em] text-stone-500">
          <tr>
            <th className="px-3 py-2 font-medium">Pos</th>
            <th className="px-3 py-2 font-medium">Driver</th>
            <th className="px-3 py-2 font-medium">Q1</th>
            <th className="px-3 py-2 font-medium">Q2</th>
            <th className="px-3 py-2 font-medium">Q3</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map((row, index) => (
            <tr key={`${row.driver.id || "driver"}-${index}`} className="bg-white">
              <td className="px-3 py-2 font-semibold tabular-nums text-stone-900">{row.position ?? "-"}</td>
              <td className="px-3 py-2">
                <DriverCell name={row.driver.name} number={row.driver.number} team={row.team.name} />
              </td>
              <td className="px-3 py-2 tabular-nums text-stone-700">{row.q1 ?? "-"}</td>
              <td className="px-3 py-2 tabular-nums text-stone-700">{row.q2 ?? "-"}</td>
              <td className="px-3 py-2 tabular-nums text-stone-700">{row.q3 ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function F1ResultsCard({
  results,
  loading,
  error,
  activeTab,
  availableTabs,
  onSelectTab,
  onRetry,
  emptyMessage,
  jumpLabel,
  onJump,
  asOf,
}: F1ResultsCardProps) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5" aria-label="Results">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-stone-900">Results{results ? ` · ${results.raceName}` : ""}</h3>
          {activeTab ? <p className="mt-0.5 text-xs text-stone-500">{SESSION_TITLES[activeTab]}</p> : null}
        </div>

        {availableTabs.length > 1 ? (
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Result session">
            {availableTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => onSelectTab(tab)}
                className={`rounded-full px-3 py-1.5 text-sm transition ${
                  activeTab === tab
                    ? "bg-stone-900 text-stone-50"
                    : "border border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:text-stone-900"
                }`}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        {loading ? <p className="text-sm text-stone-600">Loading results…</p> : null}

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Could not load results. {error}
            <button type="button" onClick={onRetry} className="ml-2 underline underline-offset-2">
              Retry
            </button>
          </div>
        ) : null}

        {!loading && !error && results && results.failedSessions.length > 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Some sessions could not be loaded ({results.failedSessions.map((kind) => TAB_LABELS[kind]).join(", ")}), so this view may be
            incomplete.
          </div>
        ) : null}

        {!loading && !error && results && activeTab === "race" ? <RaceTable rows={results.race} /> : null}
        {!loading && !error && results && activeTab === "sprint" ? <RaceTable rows={results.sprint} /> : null}
        {!loading && !error && results && activeTab === "qualifying" ? <QualifyingTable rows={results.qualifying} /> : null}

        {!loading && !error && !activeTab ? (
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
            {emptyMessage}
            {jumpLabel ? (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={onJump}
                  className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700 transition hover:border-stone-300 hover:text-stone-900"
                >
                  {jumpLabel}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {asOf ? <p className="text-xs text-stone-500">Results data as of {asOf} (Dhaka).</p> : null}
      </div>
    </section>
  );
}
