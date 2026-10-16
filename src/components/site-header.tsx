"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, UserRound } from "lucide-react";
import { sportNavigationItems } from "@/lib/sports";

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href;
}

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-stone-200/80 bg-[#f6f3ee]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2" aria-label="LIVEPULSE homepage">
            <span className="h-2 w-2 rounded-full bg-[#e45d53]" aria-hidden="true" />
            <span className="text-lg font-semibold tracking-[0.08em] text-stone-900 sm:text-xl">LIVEPULSE</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Profile features coming soon"
              title="Profile features coming soon"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 transition hover:border-stone-300 hover:text-stone-900"
            >
              <UserRound className="h-4 w-4" aria-hidden="true" />
            </button>
            <Link
              href="/favorites"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 transition hover:border-stone-300 hover:text-stone-900"
              aria-label="Open favorites"
            >
              <Heart className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <nav aria-label="Sport categories">
          <ul className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {sportNavigationItems.map((item) => {
              const active = isActive(pathname, item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm transition ${
                      active
                        ? "bg-stone-900 text-stone-50"
                        : "border border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:text-stone-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
