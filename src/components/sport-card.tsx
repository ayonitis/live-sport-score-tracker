import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { SportItem } from "@/lib/sports";
import { SmartImage } from "@/components/smart-image";

type SportCardProps = {
  sport: SportItem;
};

export function SportCard({ sport }: SportCardProps) {
  return (
    <Link
      href={sport.href}
      className="group grid overflow-hidden rounded-2xl border border-stone-200 bg-white transition hover:border-stone-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e45d53]/30 md:grid-cols-[42%_1fr]"
      aria-label={`Open ${sport.name} live scores and fixtures`}
    >
      <SmartImage
        src={sport.image.src}
        alt={sport.image.alt}
        className="h-44 w-full object-cover md:h-full"
      />

      <div className="flex items-center justify-between gap-4 p-5">
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-stone-900">{sport.name}</h3>
          <p className="mt-1 text-sm text-stone-600">{sport.subtitle}</p>
        </div>

        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-200 text-stone-700 transition group-hover:border-stone-300 group-hover:text-stone-900">
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
