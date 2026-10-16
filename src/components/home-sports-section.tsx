"use client";

import { useMemo, useState } from "react";
import { SearchBar } from "@/components/search-bar";
import { SportCard } from "@/components/sport-card";
import { sports } from "@/lib/sports";

export function HomeSportsSection() {
  const [query, setQuery] = useState("");

  const filteredSports = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return sports;
    }

    return sports.filter((sport) => sport.name.toLowerCase().includes(normalizedQuery));
  }, [query]);

  return (
    <section className="space-y-5" aria-label="LivePulse sports overview">
      <SearchBar value={query} onChange={setQuery} />

      <div className="space-y-4">
        {filteredSports.length > 0 ? (
          filteredSports.map((sport) => <SportCard key={sport.slug} sport={sport} />)
        ) : (
          <p className="rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-600">
            No matching sport category yet. Try searching for Football, Cricket, Basketball, Rugby, or
            Formula 1.
          </p>
        )}
      </div>
    </section>
  );
}
