import { NextRequest, NextResponse } from "next/server";
import { getBasketballOverview, getFallbackBasketballOverview } from "@/lib/basketball/sportscore";

function normalizeDateParam(value: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function normalizeCompetitionParam(value: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export async function GET(request: NextRequest) {
  const date = normalizeDateParam(request.nextUrl.searchParams.get("date"));
  const competition = normalizeCompetitionParam(request.nextUrl.searchParams.get("competition"));

  try {
    const overview = await getBasketballOverview(date, competition);

    return NextResponse.json(overview, {
      headers: {
        "Cache-Control": "s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    const fallback = getFallbackBasketballOverview(
      error instanceof Error ? error.message : "Unable to load basketball overview data.",
    );

    return NextResponse.json(fallback, {
      headers: {
        "Cache-Control": "s-maxage=30, stale-while-revalidate=60",
      },
    });
  }
}
