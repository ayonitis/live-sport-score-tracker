"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { F1CalendarCard } from "@/components/f1/f1-calendar-card";
import { F1EventHero } from "@/components/f1/f1-event-hero";
import { F1ResultsCard } from "@/components/f1/f1-results-card";
import { F1ScheduleCard } from "@/components/f1/f1-schedule-card";
import { F1StandingsCard, type F1StandingsView } from "@/components/f1/f1-standings-card";
import {
  formatDhakaClock,
  getWeekendStatus,
  pickFocusRound,
  pickLastCompletedRound,
} from "@/lib/f1/schedule-utils";
import type {
  F1Calendar,
  F1InitialData,
  F1ResultSessionKind,
  F1RoundResults,
  F1Standings,
} from "@/lib/f1/types";

const FIRST_SEASON = 1950;
const TAB_ORDER: F1ResultSessionKind[] = ["race", "sprint", "qualifying"];

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    let details = "";
    try {
      const body = (await response.json()) as { details?: string; error?: string };
      details = body.details || body.error || "";
    } catch {
      // ignore unreadable error bodies
    }
    throw new Error(details || `Request failed (${response.status})`);
  }

  return (await response.json()) as T;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to load F1 data.";
}

function availableTabsFor(results: F1RoundResults | null): F1ResultSessionKind[] {
  if (!results) return [];
  return TAB_ORDER.filter((tab) => results[tab].length > 0);
}

export function F1Dashboard({ initialData }: { initialData: F1InitialData }) {
  const currentYear = new Date(initialData.generatedAt).getUTCFullYear();
  const [season, setSeason] = useState<string>(initialData.season ?? String(currentYear));
  const [calendar, setCalendar] = useState<F1Calendar | null>(initialData.calendar);
  const [calendarError, setCalendarError] = useState<string | null>(initialData.calendarError);
  const [seasonLoading, setSeasonLoading] = useState(false);
  const [eventRound, setEventRound] = useState<number | null>(initialData.eventRound);
  const [resultsRound, setResultsRound] = useState<number | null>(initialData.resultsRound);
  const [results, setResults] = useState<F1RoundResults | null>(initialData.results);
  const [resultsError, setResultsError] = useState<string | null>(initialData.resultsError);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [standings, setStandings] = useState<F1Standings | null>(initialData.standings);
  const [standingsError, setStandingsError] = useState<string | null>(initialData.standingsError);
  const [standingsLoading, setStandingsLoading] = useState(false);
  const [standingsView, setStandingsView] = useState<F1StandingsView>("drivers");
  const [chosenTab, setChosenTab] = useState<F1ResultSessionKind>("race");
  const [nowMs, setNowMs] = useState(initialData.generatedAt);
  const seasonRequest = useRef(0);
  const resultsRequest = useRef(0);

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const seasonOptions = useMemo(() => {
    const years: string[] = [];
    for (let year = currentYear; year >= FIRST_SEASON; year -= 1) years.push(String(year));
    return years;
  }, [currentYear]);

  async function loadResults(targetSeason: string, round: number) {
    const requestId = ++resultsRequest.current;
    setResultsLoading(true);
    setResultsError(null);

    try {
      const data = await getJson<F1RoundResults>(`/api/f1/results?season=${targetSeason}&round=${round}`);
      if (requestId !== resultsRequest.current) return;
      setResults(data);
    } catch (error) {
      if (requestId !== resultsRequest.current) return;
      setResults(null);
      setResultsError(errorText(error));
    } finally {
      if (requestId === resultsRequest.current) setResultsLoading(false);
    }
  }

  async function loadStandings(targetSeason: string) {
    setStandingsLoading(true);
    setStandingsError(null);
    const requestId = seasonRequest.current;

    try {
      const data = await getJson<F1Standings>(`/api/f1/standings?season=${targetSeason}`);
      if (requestId !== seasonRequest.current) return;
      setStandings(data);
    } catch (error) {
      if (requestId !== seasonRequest.current) return;
      setStandings(null);
      setStandingsError(errorText(error));
    } finally {
      if (requestId === seasonRequest.current) setStandingsLoading(false);
    }
  }

  async function loadSeason(target: string) {
    const requestId = ++seasonRequest.current;
    ++resultsRequest.current;

    setSeason(target === "current" ? String(currentYear) : target);
    setSeasonLoading(true);
    setCalendar(null);
    setCalendarError(null);
    setResults(null);
    setResultsError(null);
    setResultsLoading(false);
    setStandings(null);
    setStandingsError(null);
    setStandingsLoading(false);
    setEventRound(null);
    setResultsRound(null);

    try {
      const data = await getJson<F1Calendar>(`/api/f1/season?season=${target}`);
      if (requestId !== seasonRequest.current) return;

      const now = Date.now();
      setNowMs(now);
      setSeason(data.season || target);
      setCalendar(data);

      const focus = pickFocusRound(data.races, now);
      const latest = pickLastCompletedRound(data.races, now) ?? focus;
      setEventRound(focus);
      setResultsRound(latest);
      setSeasonLoading(false);

      if (data.season) {
        void loadStandings(data.season);
        if (latest !== null) void loadResults(data.season, latest);
      }
    } catch (error) {
      if (requestId !== seasonRequest.current) return;
      setCalendarError(errorText(error));
      setSeasonLoading(false);
    }
  }

  function selectRound(round: number) {
    setEventRound(round);
    setResultsRound(round);
    if (calendar) void loadResults(calendar.season, round);
  }

  const races = useMemo(() => calendar?.races ?? [], [calendar]);
  const eventRace = races.find((race) => race.round === eventRound) ?? null;
  const focusRound = useMemo(() => pickFocusRound(races, nowMs), [races, nowMs]);
  const lastCompletedRound = useMemo(() => pickLastCompletedRound(races, nowMs), [races, nowMs]);
  const isCurrentSeason = calendar ? calendar.season === String(currentYear) : false;

  const availableTabs = availableTabsFor(results);
  const activeTab = availableTabs.includes(chosenTab) ? chosenTab : (availableTabs[0] ?? null);

  const resultsRace = races.find((race) => race.round === resultsRound) ?? null;
  const resultsStatus = resultsRace ? getWeekendStatus(resultsRace, nowMs) : null;
  const emptyMessage =
    resultsStatus === "upcoming"
      ? "Results will appear here once the weekend's sessions have run."
      : "The data source has not published results for this round yet.";
  // Offer the latest finished weekend, or the one before when the latest has no published results yet.
  const jumpRound =
    lastCompletedRound !== null && lastCompletedRound !== resultsRound
      ? lastCompletedRound
      : resultsRound !== null && resultsRound > 1 && resultsStatus === "completed"
        ? resultsRound - 1
        : null;
  const jumpRace = jumpRound === null ? null : races.find((race) => race.round === jumpRound);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-stone-700 transition hover:text-stone-900">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to homepage
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">Formula 1</h1>
          <p className="mt-1 text-sm text-stone-600">Schedule, results and championship standings (Asia/Dhaka time).</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700">
            <span className="text-xs text-stone-500">Season</span>
            <select
              value={season}
              onChange={(event) => void loadSeason(event.target.value)}
              className="bg-transparent outline-none"
              aria-label="Select season"
            >
              {seasonOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>

          <label className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700">
            <span className="text-xs text-stone-500">Round</span>
            <select
              value={eventRound ?? ""}
              onChange={(event) => selectRound(Number(event.target.value))}
              disabled={races.length === 0}
              className="max-w-[200px] bg-transparent outline-none disabled:text-stone-400"
              aria-label="Select Grand Prix round"
            >
              {races.length === 0 ? <option value="">No rounds</option> : null}
              {races.map((race) => (
                <option key={race.round} value={race.round}>
                  R{race.round} · {race.name}
                </option>
              ))}
            </select>
          </label>

          {isCurrentSeason && focusRound !== null && eventRound !== focusRound ? (
            <button
              type="button"
              onClick={() => selectRound(focusRound)}
              className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 transition hover:border-stone-300 hover:text-stone-900"
            >
              Next race
            </button>
          ) : null}
        </div>
      </div>

      {seasonLoading ? <p className="mb-4 text-sm text-stone-600">Loading season…</p> : null}

      {calendarError ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Could not load the F1 calendar. {calendarError}
          <button
            type="button"
            onClick={() => void loadSeason(season)}
            className="ml-2 inline-flex items-center gap-1 underline underline-offset-2"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      ) : null}

      {calendar && races.length === 0 && !seasonLoading ? (
        <div className="mb-4 rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-700">
          The data source has no races listed for the {calendar.season} season.
        </div>
      ) : null}

      {calendar && eventRace ? (
        <div className="space-y-6">
          <F1EventHero
            race={eventRace}
            status={getWeekendStatus(eventRace, nowMs)}
            nowMs={nowMs}
            isNextEvent={isCurrentSeason && eventRace.round === focusRound && getWeekendStatus(eventRace, nowMs) !== "completed"}
          />

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
            <div className="space-y-6">
              <F1ScheduleCard race={eventRace} results={resultsRound === eventRace.round ? results : null} nowMs={nowMs} />

              <F1ResultsCard
                results={results}
                loading={resultsLoading}
                error={resultsError}
                activeTab={activeTab}
                availableTabs={availableTabs}
                onSelectTab={setChosenTab}
                onRetry={() => {
                  if (resultsRound !== null) void loadResults(calendar.season, resultsRound);
                }}
                emptyMessage={emptyMessage}
                jumpLabel={jumpRace ? `View results: ${jumpRace.name}` : null}
                onJump={() => {
                  if (jumpRound !== null) selectRound(jumpRound);
                }}
                asOf={results ? formatDhakaClock(results.fetchedAt) : null}
              />
            </div>

            <div className="space-y-6">
              <F1StandingsCard
                standings={standings}
                loading={standingsLoading}
                error={standingsError}
                view={standingsView}
                onChangeView={setStandingsView}
                onRetry={() => void loadStandings(calendar.season)}
                asOf={standings ? formatDhakaClock(standings.fetchedAt) : null}
              />

              <F1CalendarCard season={calendar.season} races={races} selectedRound={eventRound} nowMs={nowMs} onSelectRound={selectRound} />
            </div>
          </div>
        </div>
      ) : null}

      <p className="mt-8 text-xs leading-5 text-stone-500">
        Formula 1 data from Jolpica-F1 (api.jolpi.ca), licensed CC BY-NC-SA 4.0 for non-commercial use. Unofficial and not affiliated
        with Formula 1.{calendar ? ` Calendar data as of ${formatDhakaClock(calendar.fetchedAt) ?? "an unknown time"} (Dhaka).` : ""}
      </p>
    </main>
  );
}
