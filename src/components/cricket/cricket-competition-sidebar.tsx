"use client";

import { RotateCcw } from "lucide-react";
import { EntityLogo } from "@/components/football/entity-logo";
import type { CricketCompetitionCatalog } from "@/lib/cricket/types";

type CricketCompetitionSidebarProps = {
  catalog: CricketCompetitionCatalog;
  selectedCompetitionId: string | null;
  onSelectCompetition: (competitionId: string | null) => void;
  matchCounts: Record<string, number>;
  onResetAllFilters: () => void;
};

type CompetitionSectionProps = {
  title: string;
  items: CricketCompetitionCatalog["topInternationalCompetitions"];
  selectedCompetitionId: string | null;
  onSelectCompetition: (competitionId: string) => void;
  matchCounts: Record<string, number>;
};

function CompetitionSection({
  title,
  items,
  selectedCompetitionId,
  onSelectCompetition,
  matchCounts,
}: CompetitionSectionProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section>
      <h3 className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#432a2a]">{title}</h3>

      <ul className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        {items.map((item) => {
          const selected = selectedCompetitionId === item.id;
          const count = matchCounts[item.id] ?? 0;
          const disabled = !item.supported;

          return (
            <li key={item.key} className="border-b border-stone-200 last:border-b-0">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelectCompetition(item.id)}
                aria-pressed={selected}
                className={`flex h-9 w-full items-center gap-2.5 px-3 text-left text-sm transition ${
                  selected
                    ? "bg-[#fdebe9] text-stone-900"
                    : disabled
                      ? "cursor-not-allowed text-stone-400"
                      : "text-stone-700 hover:bg-stone-50 hover:text-stone-900"
                }`}
                title={disabled ? item.supportNote ?? "Not available from provider metadata" : undefined}
              >
                <EntityLogo src={item.logoUrl} alt={`${item.name} logo`} size={22} />
                <span className="line-clamp-1 flex-1">{item.name}</span>
                <span className="text-[11px] text-stone-500">{disabled ? "N/A" : count}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function CricketCompetitionSidebar({
  catalog,
  selectedCompetitionId,
  onSelectCompetition,
  matchCounts,
  onResetAllFilters,
}: CricketCompetitionSidebarProps) {
  const allCompetitionsActive = selectedCompetitionId === null;

  return (
    <aside className="space-y-4">
      <div className="rounded-xl border border-stone-200 bg-white p-2.5">
        <button
          type="button"
          onClick={() => onSelectCompetition(null)}
          aria-pressed={allCompetitionsActive}
          className={`flex h-9 w-full items-center justify-between rounded-lg px-3 text-sm transition ${
            allCompetitionsActive
              ? "bg-stone-900 text-stone-50"
              : "text-stone-700 hover:bg-stone-50 hover:text-stone-900"
          }`}
        >
          <span>All competitions</span>
        </button>

        <button
          type="button"
          onClick={onResetAllFilters}
          className="mt-2 inline-flex h-8 w-full items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white text-xs font-medium text-stone-600 transition hover:border-stone-300 hover:text-stone-900"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Reset all filters
        </button>
      </div>

      <CompetitionSection
        title="Top International Competitions"
        items={catalog.topInternationalCompetitions}
        selectedCompetitionId={selectedCompetitionId}
        onSelectCompetition={onSelectCompetition}
        matchCounts={matchCounts}
      />

      <CompetitionSection
        title="Top Domestic Leagues"
        items={catalog.topDomesticLeagues}
        selectedCompetitionId={selectedCompetitionId}
        onSelectCompetition={onSelectCompetition}
        matchCounts={matchCounts}
      />

      <p className="px-1 text-xs leading-5 text-stone-500">{catalog.limitationNote}</p>
      <p className="px-1 text-[11px] text-stone-500">Data source: SportScore API (subject to provider terms and attribution).</p>
    </aside>
  );
}
