import { EventsPanel } from "@/components/events-panel";
import { HomeSportsSection } from "@/components/home-sports-section";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
        <HomeSportsSection />
        <EventsPanel />
      </div>
    </main>
  );
}
