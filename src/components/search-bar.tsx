import { Search } from "lucide-react";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
};

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative">
      <label htmlFor="sport-search" className="sr-only">
        Find a team, league or sport
      </label>
      <Search
        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500"
        aria-hidden="true"
      />
      <input
        id="sport-search"
        name="sport-search"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Find a team, league or sport..."
        className="h-12 w-full rounded-2xl border border-stone-200 bg-white pl-11 pr-4 text-sm text-stone-900 outline-none ring-[#e45d53]/30 placeholder:text-stone-500 focus:border-[#e45d53] focus:ring-4"
      />
    </div>
  );
}
