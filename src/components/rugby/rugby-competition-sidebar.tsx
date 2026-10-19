"use client";

import { RotateCcw } from "lucide-react";
import type { RugbyCompetitionCatalog, RugbyCompetitionFilterItem } from "@/lib/rugby/types";
import { EntityLogo } from "@/components/football/entity-logo";

type RugbyCompetitionSidebarProps = {
  catalog: RugbyCompetitionCatalog;
  otherCompetitions: RugbyCompetitionFilterItem[];
  selectedCompetitionId: string | null;
  onSelectCompetition: (competitionId: string | null) => void;
  matchCounts: Record<string, number>;
  onResetAllFilters: () => void;
};

type CompetitionListSectionProps = {
  title: string;
  items: RugbyCompetitionFilterItem[];
  selectedCompetitionId: string | null;
  onSelectCompetition: (competitionId: string) => void;
  matchCounts: Record<string, number>;
};

function CompetitionListSection({
  title,
  items,
  selectedCompetitionId,
  onSelectCompetition,
  matchCounts,
}: CompetitionListSectionProps) {
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

          return (
            <li key={item.key} className="border-b border-stone-200 last:border-b-0">
              <button
                type="button"
                onClick={() => onSelectCompetition(item.id)}
                aria-pressed={selected}
                className={`flex h-9 w-full items-center gap-2.5 px-3 text-left text-sm transition ${
                  selected ? "bg-[#fdebe9] text-stone-900" : "text-stone-700 hover:bg-stone-50 hover:text-stone-900"
                }`}
              >
                <EntityLogo src={item.logoUrl} alt={`${item.name} logo`} size={22} />
                <span className="line-clamp-1 flex-1">{item.name}</span>
                <span className="text-[11px] text-stone-500">{count}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function RugbyCompetitionSidebar({
  catalog,
  otherCompetitions,
  selectedCompetitionId,
  onSelectCompetition,
  matchCounts,
  onResetAllFilters,
}: RugbyCompetitionSidebarProps) {
  const allCompetitionsActive = selectedCompetitionId === null;

  return (
    <aside className="space-y-4">
      <div className="rounded-xl border border-stone-200 bg-white p-2.5">
        <button
          type="button"
          onClick={() => onSelectCompetition(null)}
          aria-pressed={allCompetitionsActive}
          className={`flex h-9 w-full items-center justify-between rounded-lg px-3 text-sm transition ${
            allCompetitionsActive ? "bg-stone-900 text-stone-50" : "text-stone-700 hover:bg-stone-50 hover:text-stone-900"
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

      <CompetitionListSection
        title="International"
        items={catalog.internationalCompetitions}
        selectedCompetitionId={selectedCompetitionId}
        onSelectCompetition={onSelectCompetition}
        matchCounts={matchCounts}
      />

      <CompetitionListSection
        title="Club & Domestic"
        items={catalog.clubCompetitions}
        selectedCompetitionId={selectedCompetitionId}
        onSelectCompetition={onSelectCompetition}
        matchCounts={matchCounts}
      />

      <CompetitionListSection
        title="Also on this date"
        items={otherCompetitions}
        selectedCompetitionId={selectedCompetitionId}
        onSelectCompetition={onSelectCompetition}
        matchCounts={matchCounts}
      />

      <p className="px-1 text-xs leading-5 text-stone-500">{catalog.limitationNote}</p>
    </aside>
  );
}
