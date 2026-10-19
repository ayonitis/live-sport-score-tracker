"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Filter, RefreshCw, Search, X } from "lucide-react";
import { RugbyCompetitionSidebar } from "@/components/rugby/rugby-competition-sidebar";
import { RugbyMatchCard } from "@/components/rugby/rugby-match-card";
import type {
  RugbyCompetitionFilterItem,
  RugbyMatch,
  RugbyMatchFilterStatus,
  RugbyOverviewData,
} from "@/lib/rugby/types";

type StatusTab = { label: string; value: RugbyMatchFilterStatus };

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

function formatAsOf(value: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Dhaka",
  }).format(date);
}

function shiftDhakaDate(dateString: string, days: number): string {
  const base = new Date(`${dateString}T00:00:00+06:00`);
  base.setUTCDate(base.getUTCDate() + days);

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(base);
}

function getTodayDhakaDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function buildCompetitionCounts(matches: RugbyMatch[], items: RugbyCompetitionFilterItem[]): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item.id] = matches.filter((match) => match.competition.id === item.id).length;
    return acc;
  }, {});
}

function matchPassesStatusFilter(match: RugbyMatch, statusFilter: RugbyMatchFilterStatus): boolean {
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

export function RugbyDashboard({ initialData }: { initialData: RugbyOverviewData }) {
  const [date, setDate] = useState(initialData.date);
  // "auto" shows live matches when there are any, otherwise everything for the date, until a tab is chosen.
  const [statusChoice, setStatusChoice] = useState<RugbyMatchFilterStatus | "auto">("auto");
  const [query, setQuery] = useState("");
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string | null>(null);
  const [overview, setOverview] = useState<RugbyOverviewData>(initialData);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialData.providerError);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const skipInitialFetch = useRef(initialData.providerError === null);

  const allCatalogItems = useMemo(
    () => [
      ...overview.competitionCatalog.internationalCompetitions,
      ...overview.competitionCatalog.clubCompetitions,
      ...overview.otherCompetitions,
    ],
    [overview.competitionCatalog.internationalCompetitions, overview.competitionCatalog.clubCompetitions, overview.otherCompetitions],
  );

  const competitionCounts = useMemo(
    () => buildCompetitionCounts(overview.matches, allCatalogItems),
    [overview.matches, allCatalogItems],
  );

  const fetchOverview = useCallback(
    async (signal?: AbortSignal) => {
      const params = new URLSearchParams({ date });
      const response = await fetch(`/api/rugby/overview?${params.toString()}`, { signal });

      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }

      return (await response.json()) as RugbyOverviewData;
    },
    [date],
  );

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }

    let active = true;
    const controller = new AbortController();

    async function loadData() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const data = await fetchOverview(controller.signal);
        if (!active) return;
        setOverview(data);
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        setErrorMessage(error instanceof Error ? error.message : "Unable to load rugby matches.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadData();

    return () => {
      active = false;
      controller.abort();
    };
  }, [fetchOverview, reloadToken]);

  const hasLiveMatches = useMemo(() => overview.matches.some((match) => match.status === "live"), [overview.matches]);

  useEffect(() => {
    if (!hasLiveMatches || errorMessage) {
      return;
    }

    const interval = window.setInterval(async () => {
      try {
        const data = await fetchOverview();
        setOverview(data);
      } catch {
        // keep previous data during transient polling failures
      }
    }, 60000);

    return () => {
      window.clearInterval(interval);
    };
  }, [hasLiveMatches, errorMessage, fetchOverview]);

  const selectedCompetition = useMemo(
    () => allCatalogItems.find((item) => item.id === selectedCompetitionId) ?? null,
    [allCatalogItems, selectedCompetitionId],
  );

  // A competition that is not playing on the newly selected date is treated as "all competitions".
  const activeCompetitionId = selectedCompetition?.id ?? null;

  const statusFilter: RugbyMatchFilterStatus = statusChoice === "auto" ? (hasLiveMatches ? "live" : "all") : statusChoice;
  const showingAutoFallback = statusChoice === "auto" && !hasLiveMatches && overview.matches.length > 0;

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
    setStatusChoice("auto");
    setQuery("");
    setSelectedCompetitionId(null);
  }

  const todayDhakaDate = getTodayDhakaDate();
  const asOfText = formatAsOf(overview.dataAsOf);
  const partialNotice =
    overview.diagnostics.completeness === "partial" && !errorMessage
      ? "Some rugby data could not be loaded, so this list may be incomplete."
      : null;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-stone-700 transition hover:text-stone-900">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to homepage
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">Rugby</h1>
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
          <RugbyCompetitionSidebar
            catalog={overview.competitionCatalog}
            otherCompetitions={overview.otherCompetitions}
            selectedCompetitionId={activeCompetitionId}
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
                    onClick={() => setStatusChoice(tab.value)}
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

            <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDate(shiftDhakaDate(date, -1))}
                  className="inline-flex items-center justify-center gap-1 rounded-xl border border-stone-200 px-2 py-2 text-sm text-stone-700 transition hover:border-stone-300 hover:text-stone-900"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Prev
                </button>
                <button
                  type="button"
                  onClick={() => setDate(todayDhakaDate)}
                  className="rounded-xl border border-stone-200 px-2 py-2 text-sm text-stone-700 transition hover:border-stone-300 hover:text-stone-900"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setDate(shiftDhakaDate(date, 1))}
                  className="inline-flex items-center justify-center gap-1 rounded-xl border border-stone-200 px-2 py-2 text-sm text-stone-700 transition hover:border-stone-300 hover:text-stone-900"
                >
                  Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <label className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700">
                <CalendarDays className="h-4 w-4 text-stone-500" aria-hidden="true" />
                <span className="sr-only">Select fixture date (Asia/Dhaka)</span>
                <input
                  type="date"
                  value={date}
                  onChange={(event) => {
                    if (event.target.value) setDate(event.target.value);
                  }}
                  className="w-full bg-transparent outline-none"
                  aria-label="Select rugby fixtures date in Asia Dhaka"
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

            <label className="mt-3 inline-flex w-full items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700">
              <Search className="h-4 w-4 text-stone-500" aria-hidden="true" />
              <span className="sr-only">Search by team or competition</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search teams or competitions..."
                className="w-full bg-transparent outline-none placeholder:text-stone-500"
                aria-label="Search by rugby team or competition"
              />
            </label>
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

          {showingAutoFallback ? (
            <p className="text-sm text-stone-600">
              No live rugby right now. Showing all fixtures and results for {formatPageDate(overview.date)}.
            </p>
          ) : null}

          {partialNotice ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{partialNotice}</div>
          ) : null}

          <p className="text-xs text-stone-500">
            Rugby union fixtures and scores from API-Sports.
            {asOfText ? ` Data as of ${asOfText} (Dhaka).` : ""}
            {hasLiveMatches ? " Live scores refresh automatically." : ""}
          </p>

          {loading ? <p className="text-sm text-stone-600">Loading rugby fixtures…</p> : null}

          {errorMessage ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Could not load rugby fixtures. {errorMessage}
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setReloadToken((token) => token + 1);
                }}
                className="ml-2 inline-flex items-center gap-1 underline underline-offset-2"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </button>
            </div>
          ) : null}

          {!loading && !errorMessage && filteredMatches.length === 0 ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-700">
              {overview.matches.length === 0
                ? `No rugby fixtures were returned for ${formatPageDate(overview.date)}. Try another date.`
                : selectedCompetition
                  ? `No ${selectedCompetition.name} fixtures found for ${formatPageDate(overview.date)} with the current filters.`
                  : `No rugby fixtures match the current filters for ${formatPageDate(overview.date)}.`}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-xs text-stone-700 transition hover:border-stone-300 hover:text-stone-900"
                >
                  Clear all filters
                </button>
                <button
                  type="button"
                  onClick={() => setDate(shiftDhakaDate(date, 1))}
                  className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-xs text-stone-700 transition hover:border-stone-300 hover:text-stone-900"
                >
                  Next day
                </button>
                <button
                  type="button"
                  onClick={() => setDate(todayDhakaDate)}
                  className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-xs text-stone-700 transition hover:border-stone-300 hover:text-stone-900"
                >
                  Today
                </button>
              </div>
            </div>
          ) : null}

          {!errorMessage && filteredMatches.length > 0 ? (
            <div className="space-y-3">
              {filteredMatches.map((match) => (
                <RugbyMatchCard key={match.id} match={match} />
              ))}
            </div>
          ) : null}
        </section>
      </div>

      {mobileFiltersOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Rugby competition filters">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(false)}
            className="absolute inset-0 bg-black/40"
            aria-label="Close rugby competition filters"
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[82vh] overflow-hidden rounded-t-2xl border border-stone-200 bg-[#f6f3ee]">
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
              <p className="text-sm font-semibold text-stone-900">Competition filters</p>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="rounded-full border border-stone-200 bg-white p-1.5 text-stone-700"
                aria-label="Close rugby competition filters"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[calc(82vh-57px)] overflow-y-auto p-4">
              <RugbyCompetitionSidebar
                catalog={overview.competitionCatalog}
                otherCompetitions={overview.otherCompetitions}
                selectedCompetitionId={activeCompetitionId}
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
