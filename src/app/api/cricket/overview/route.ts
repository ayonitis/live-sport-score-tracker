import { NextRequest, NextResponse } from "next/server";
import { getCricketOverview } from "@/lib/cricket/sportscore";

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
  try {
    const date = normalizeDateParam(request.nextUrl.searchParams.get("date"));
    const competition = normalizeCompetitionParam(request.nextUrl.searchParams.get("competition"));
    const overview = await getCricketOverview(date, competition);

    return NextResponse.json(overview, {
      headers: {
        "Cache-Control": "s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to load cricket overview data.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 },
    );
  }
}
