"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { SportItem } from "@/lib/sports";
import { SmartImage } from "@/components/smart-image";

type ViewTab = "Live" | "Upcoming" | "Results";

const tabs: ViewTab[] = ["Live", "Upcoming", "Results"];

type SportPageTemplateProps = {
  sport: SportItem;
};

export function SportPageTemplate({ sport }: SportPageTemplateProps) {
  const [activeTab, setActiveTab] = useState<ViewTab>("Live");

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-stone-700 transition hover:text-stone-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to homepage
      </Link>

      <section className="mt-4 overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <SmartImage src={sport.image.src} alt={sport.image.alt} className="h-52 w-full object-cover sm:h-64" />

        <div className="space-y-6 p-5 sm:p-7">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">{sport.name}</h1>
            <p className="mt-2 text-sm text-stone-600">Live scores & fixtures</p>
          </div>

          <div>
            <div role="tablist" aria-label={`${sport.name} feed filters`} className="flex flex-wrap gap-2">
              {tabs.map((tab) => {
                const selected = activeTab === tab;

                return (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls={`panel-${tab.toLowerCase()}`}
                    id={`tab-${tab.toLowerCase()}`}
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-full px-4 py-2 text-sm transition ${
                      selected
                        ? "bg-stone-900 text-stone-50"
                        : "border border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:text-stone-900"
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            <div
              role="tabpanel"
              id={`panel-${activeTab.toLowerCase()}`}
              aria-labelledby={`tab-${activeTab.toLowerCase()}`}
              className="mt-5 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-5"
            >
              <p className="text-sm text-stone-700">
                {activeTab} updates for {sport.name} will appear here once the live-data integration is connected
                in a later phase.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
