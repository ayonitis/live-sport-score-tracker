"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Filter, Search, X } from "lucide-react";
import { CompetitionSidebar } from "@/components/football/competition-sidebar";
import { FootballMatchCard } from "@/components/football/football-match-card";
import type { CompetitionFilterItem, FootballMatch, FootballOverviewData, MatchFilterStatus } from "@/lib/football/types";

type StatusTab = { label: string; value: MatchFilterStatus };

const statusTabs: StatusTab[] = [
  { label: "Live", value: "live" },
  { label: "Upcoming", value: "upcoming" },
  { label: "Results", value: "finished" },
  { label: "All", value: "all" },
];

function formatPageDate(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00+06:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Dhaka",
  }).format(date);
}

function buildCompetitionCounts(matches: FootballMatch[], items: CompetitionFilterItem[]): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item.id] = matches.filter((match) => match.competition.id === item.id).length;
    return acc;
  }, {});
}

function matchPassesStatusFilter(match: FootballMatch, statusFilter: MatchFilterStatus): boolean {
  if (statusFilter === "all") {
    return true;
  }

  if (statusFilter === "live") {
    return match.status === "live";
  }

  if (statusFilter === "upcoming") {
    return match.status === "upcoming";
  }

  return ["finished", "postponed", "cancelled", "abandoned", "suspended"].includes(match.status);
}

export function FootballDashboard({ initialData }: { initialData: FootballOverviewData }) {
  const [date, setDate] = useState(initialData.date);
  const [statusFilter, setStatusFilter] = useState<MatchFilterStatus>("all");
  const [query, setQuery] = useState("");
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string | null>(null);
  const [overview, setOverview] = useState<FootballOverviewData>(initialData);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const allCatalogItems = useMemo(
    () => [...overview.competitionCatalog.topCompetitions, ...overview.competitionCatalog.topLeagues],
    [overview.competitionCatalog.topCompetitions, overview.competitionCatalog.topLeagues],
  );

  const competitionCounts = useMemo(
    () => buildCompetitionCounts(overview.matches, allCatalogItems),
    [overview.matches, allCatalogItems],
  );

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadOverviewByDate() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const params = new URLSearchParams({ date });
        if (selectedCompetitionId) {
          params.set("competition", selectedCompetitionId);
        }

        const response = await fetch(`/api/football/overview?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed (${response.status})`);
        }

        const data = (await response.json()) as FootballOverviewData;

        if (!active) {
          return;
        }

        setOverview(data);
      } catch (error) {
        if (!active || controller.signal.aborted) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Unable to load matches.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadOverviewByDate();

    return () => {
      active = false;
      controller.abort();
    };
  }, [date, selectedCompetitionId]);

  const selectedCompetition = useMemo(
    () => allCatalogItems.find((item) => item.id === selectedCompetitionId) ?? null,
    [allCatalogItems, selectedCompetitionId],
  );

  const filteredMatches = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase();

    return overview.matches.filter((match) => {
      if (!matchPassesStatusFilter(match, statusFilter)) {
        return false;
      }

      if (selectedCompetition && match.competition.id !== selectedCompetition.id) {
        return false;
      }

      if (!loweredQuery) {
        return true;
      }

      const target = [match.homeTeam.name, match.awayTeam.name, match.competition.name].join(" ").toLowerCase();
      return target.includes(loweredQuery);
    });
  }, [overview.matches, query, selectedCompetition, statusFilter]);

  function resetAllFilters() {
    setStatusFilter("all");
    setQuery("");
    setSelectedCompetitionId(null);
  }

  const devModeDiagnostics =
    process.env.NODE_ENV === "development" && overview.diagnostics.completeness === "partial"
      ? `Partial provider response: ${overview.diagnostics.failedCompetitionRequests} competition request(s) failed for ${overview.date}.`
      : null;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-stone-700 transition hover:text-stone-900">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to homepage
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">Football</h1>
          <p className="mt-1 text-sm text-stone-600">{formatPageDate(overview.date)} (Asia/Dhaka)</p>
        </div>

        <button
          type="button"
          onClick={() => setMobileFiltersOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 lg:hidden"
        >
          <Filter className="h-4 w-4" aria-hidden="true" />
          Competitions
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
        <div className="hidden lg:block lg:sticky lg:top-24 lg:max-h-[calc(100vh-7.5rem)] lg:overflow-y-auto lg:pr-1">
          <CompetitionSidebar
            catalog={overview.competitionCatalog}
            selectedCompetitionId={selectedCompetitionId}
            onSelectCompetition={setSelectedCompetitionId}
            matchCounts={competitionCounts}
            onResetAllFilters={resetAllFilters}
          />
        </div>

        <section className="space-y-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-2.5">
              {statusTabs.map((tab) => {
                const selected = statusFilter === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setStatusFilter(tab.value)}
                    className={`rounded-full px-3 py-1.5 text-sm transition ${
                      selected
                        ? "bg-stone-900 text-stone-50"
                        : "border border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:text-stone-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)_auto]">
              <label className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700">
                <CalendarDays className="h-4 w-4 text-stone-500" aria-hidden="true" />
                <span className="sr-only">Select fixture date (Asia/Dhaka)</span>
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="w-full bg-transparent outline-none"
                  aria-label="Select fixtures date in Asia Dhaka"
                />
              </label>

              <label className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700">
                <Search className="h-4 w-4 text-stone-500" aria-hidden="true" />
                <span className="sr-only">Search by team or competition</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search teams or competitions..."
                  className="w-full bg-transparent outline-none placeholder:text-stone-500"
                  aria-label="Search by team or competition"
                />
              </label>

              <button
                type="button"
                onClick={resetAllFilters}
                className="rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-700 transition hover:border-stone-300 hover:text-stone-900"
              >
                Reset filters
              </button>
            </div>
          </div>

          {selectedCompetition ? (
            <div className="rounded-xl border border-stone-200 bg-[#fdebe9] px-3 py-2 text-sm text-stone-800">
              Showing <span className="font-medium">{selectedCompetition.name}</span> only.
              <button
                type="button"
                onClick={() => setSelectedCompetitionId(null)}
                className="ml-2 underline decoration-stone-500 underline-offset-2"
              >
                Clear competition filter
              </button>
            </div>
          ) : null}

          {devModeDiagnostics ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {devModeDiagnostics}
            </div>
          ) : null}

          {loading ? <p className="text-sm text-stone-600">Loading fixtures…</p> : null}

          {errorMessage ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Could not load matches for this date. {errorMessage}
            </div>
          ) : null}

          {!loading && !errorMessage && filteredMatches.length === 0 ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-700">
              {selectedCompetition
                ? `No ${selectedCompetition.name} matches found for ${formatPageDate(overview.date)} with the current filters.`
                : `No football matches match the current filters for ${formatPageDate(overview.date)}.`}

              <button
                type="button"
                onClick={resetAllFilters}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-xs text-stone-700 transition hover:border-stone-300 hover:text-stone-900"
              >
                Clear all filters
              </button>
            </div>
          ) : null}

          {!errorMessage && filteredMatches.length > 0 ? (
            <div className="space-y-3">
              {filteredMatches.map((match) => (
                <FootballMatchCard key={match.id} match={match} />
              ))}
            </div>
          ) : null}
        </section>
      </div>

      {mobileFiltersOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Competition filters">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(false)}
            className="absolute inset-0 bg-black/40"
            aria-label="Close competition filters"
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[82vh] overflow-hidden rounded-t-2xl border border-stone-200 bg-[#f6f3ee]">
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
              <p className="text-sm font-semibold text-stone-900">Competition filters</p>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="rounded-full border border-stone-200 bg-white p-1.5 text-stone-700"
                aria-label="Close competition filters"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[calc(82vh-57px)] overflow-y-auto p-4">
              <CompetitionSidebar
                catalog={overview.competitionCatalog}
                selectedCompetitionId={selectedCompetitionId}
                onSelectCompetition={(value) => {
                  setSelectedCompetitionId(value);
                  setMobileFiltersOpen(false);
                }}
                matchCounts={competitionCounts}
                onResetAllFilters={resetAllFilters}
              />
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
