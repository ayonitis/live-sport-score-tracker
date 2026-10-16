"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Filter, RefreshCw, Search, X } from "lucide-react";
import { CricketCompetitionSidebar } from "@/components/cricket/cricket-competition-sidebar";
import { CricketMatchCard } from "@/components/cricket/cricket-match-card";
import type {
  CricketCompetitionFilterItem,
  CricketFormat,
  CricketMatch,
  CricketMatchFilterStatus,
  CricketOverviewData,
} from "@/lib/cricket/types";

type StatusTab = { label: string; value: CricketMatchFilterStatus };

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

function buildCompetitionCounts(matches: CricketMatch[], items: CricketCompetitionFilterItem[]): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item.id] = matches.filter((match) => match.competition.id === item.id).length;
    return acc;
  }, {});
}

function matchPassesStatusFilter(match: CricketMatch, statusFilter: CricketMatchFilterStatus): boolean {
  if (statusFilter === "all") {
    return true;
  }

  if (statusFilter === "live") {
    return match.status === "live";
  }

  if (statusFilter === "upcoming") {
    return match.status === "upcoming";
  }

  return ["finished", "postponed", "cancelled", "abandoned", "delayed", "suspended"].includes(match.status);
}

function formatLabel(format: CricketFormat): string {
  if (format === "test") return "Test";
  if (format === "odi") return "ODI";
  return "T20";
}

export function CricketDashboard({ initialData }: { initialData: CricketOverviewData }) {
  const [date, setDate] = useState(initialData.date);
  const [statusFilter, setStatusFilter] = useState<CricketMatchFilterStatus>("all");
  const [formatFilter, setFormatFilter] = useState<CricketFormat | "all">("all");
  const [query, setQuery] = useState("");
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string | null>(null);
  const [overview, setOverview] = useState<CricketOverviewData>(initialData);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const allCatalogItems = useMemo(
    () => [...overview.competitionCatalog.topInternationalCompetitions, ...overview.competitionCatalog.topDomesticLeagues],
    [overview.competitionCatalog.topInternationalCompetitions, overview.competitionCatalog.topDomesticLeagues],
  );

  const competitionCounts = useMemo(
    () => buildCompetitionCounts(overview.matches, allCatalogItems),
    [overview.matches, allCatalogItems],
  );

  const fetchOverview = useCallback(
    async (signal?: AbortSignal) => {
      const params = new URLSearchParams({ date });
      if (selectedCompetitionId) {
        params.set("competition", selectedCompetitionId);
      }

      const response = await fetch(`/api/cricket/overview?${params.toString()}`, { signal });

      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }

      return (await response.json()) as CricketOverviewData;
    },
    [date, selectedCompetitionId],
  );

  useEffect(() => {
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
        setErrorMessage(error instanceof Error ? error.message : "Unable to load cricket matches.");
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

  useEffect(() => {
    const hasLiveMatches = overview.matches.some((match) => match.status === "live");
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
  }, [overview.matches, errorMessage, fetchOverview]);

  const selectedCompetition = useMemo(
    () => allCatalogItems.find((item) => item.id === selectedCompetitionId) ?? null,
    [allCatalogItems, selectedCompetitionId],
  );

  useEffect(() => {
    if (formatFilter !== "all" && !overview.availableFormats.includes(formatFilter)) {
      setFormatFilter("all");
    }
  }, [formatFilter, overview.availableFormats]);

  const filteredMatches = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase();

    return overview.matches.filter((match) => {
      if (!matchPassesStatusFilter(match, statusFilter)) {
        return false;
      }

      if (selectedCompetition && match.competition.id !== selectedCompetition.id) {
        return false;
      }

      if (formatFilter !== "all" && match.format !== formatFilter) {
        return false;
      }

      if (!loweredQuery) {
        return true;
      }

      const target = [match.homeTeam.name, match.awayTeam.name, match.competition.name].join(" ").toLowerCase();
      return target.includes(loweredQuery);
    });
  }, [formatFilter, overview.matches, query, selectedCompetition, statusFilter]);

  function resetAllFilters() {
    setStatusFilter("all");
    setFormatFilter("all");
    setQuery("");
    setSelectedCompetitionId(null);
  }

  const devModeDiagnostics =
    process.env.NODE_ENV === "development" && overview.diagnostics.completeness === "partial"
      ? `Partial provider response: ${overview.diagnostics.failedCompetitionRequests} curated competition request(s) failed for ${overview.date}.`
      : null;

  const todayDhakaDate = getTodayDhakaDate();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-stone-700 transition hover:text-stone-900">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to homepage
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">Cricket</h1>
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
          <CricketCompetitionSidebar
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

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setFormatFilter("all")}
                className={`rounded-full px-3 py-1.5 text-xs transition ${
                  formatFilter === "all"
                    ? "bg-[#fdebe9] text-stone-900"
                    : "border border-stone-200 text-stone-700 hover:border-stone-300 hover:text-stone-900"
                }`}
              >
                All formats
              </button>
              {overview.availableFormats.map((format) => {
                const selected = formatFilter === format;
                return (
                  <button
                    key={format}
                    type="button"
                    onClick={() => setFormatFilter(format)}
                    className={`rounded-full px-3 py-1.5 text-xs transition ${
                      selected
                        ? "bg-[#fdebe9] text-stone-900"
                        : "border border-stone-200 text-stone-700 hover:border-stone-300 hover:text-stone-900"
                    }`}
                  >
                    {formatLabel(format)}
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
                  onChange={(event) => setDate(event.target.value)}
                  className="w-full bg-transparent outline-none"
                  aria-label="Select cricket fixtures date in Asia Dhaka"
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
                aria-label="Search by cricket team or competition"
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

          {devModeDiagnostics ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {devModeDiagnostics}
            </div>
          ) : null}

          <p className="text-xs text-stone-500">
            Provider note: SportScore cricket currently supplies summary score lines. Innings, overs, target, and run-rate details are displayed when they are included in the status text.
          </p>

          {loading ? <p className="text-sm text-stone-600">Loading cricket fixtures…</p> : null}

          {errorMessage ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Could not load cricket fixtures. {errorMessage}
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
              {selectedCompetition
                ? `No ${selectedCompetition.name} fixtures found for ${formatPageDate(overview.date)} with the current filters.`
                : `No cricket fixtures match the current filters for ${formatPageDate(overview.date)}.`}

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
                <CricketMatchCard key={match.id} match={match} />
              ))}
            </div>
          ) : null}
        </section>
      </div>

      {mobileFiltersOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Cricket competition filters">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(false)}
            className="absolute inset-0 bg-black/40"
            aria-label="Close cricket competition filters"
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[82vh] overflow-hidden rounded-t-2xl border border-stone-200 bg-[#f6f3ee]">
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
              <p className="text-sm font-semibold text-stone-900">Competition filters</p>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="rounded-full border border-stone-200 bg-white p-1.5 text-stone-700"
                aria-label="Close cricket competition filters"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[calc(82vh-57px)] overflow-y-auto p-4">
              <CricketCompetitionSidebar
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
