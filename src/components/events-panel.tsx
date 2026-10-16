import { CalendarClock } from "lucide-react";
import { SmartImage } from "@/components/smart-image";

const todaysDate = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
}).format(new Date());

export function EventsPanel() {
  return (
    <aside className="rounded-2xl border border-stone-200 bg-white p-5 lg:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#e45d53]">Today</p>
      <p className="mt-1 text-sm text-stone-700">{todaysDate}</p>

      <div className="mt-4 overflow-hidden rounded-xl border border-stone-200">
        <SmartImage
          src="https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80"
          alt="Stadium lights over a football pitch"
          className="h-36 w-full object-cover"
        />
      </div>

      <h2 className="mt-5 text-base font-semibold text-stone-900">Upcoming events</h2>

      <div className="mt-3 rounded-xl border border-dashed border-stone-300 bg-stone-50/70 p-4 text-sm text-stone-600">
        <p className="inline-flex items-start gap-2">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" aria-hidden="true" />
          <span>Upcoming events will appear here once live data is connected.</span>
        </p>
      </div>
    </aside>
  );
}
