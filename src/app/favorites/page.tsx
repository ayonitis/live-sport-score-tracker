import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function FavoritesPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-stone-700 hover:text-stone-900">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to homepage
      </Link>

      <section className="mt-4 rounded-2xl border border-stone-200 bg-white p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Favorites</h1>
        <p className="mt-3 text-sm text-stone-600">
          Favorite teams and competitions will appear here in a future phase.
        </p>
      </section>
    </main>
  );
}
