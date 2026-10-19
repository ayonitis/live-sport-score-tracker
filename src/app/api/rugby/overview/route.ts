import { NextRequest, NextResponse } from "next/server";
import { getRugbyOverview } from "@/lib/rugby/api-sports";

function normalizeDateParam(value: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

export async function GET(request: NextRequest) {
  try {
    const date = normalizeDateParam(request.nextUrl.searchParams.get("date"));
    const overview = await getRugbyOverview(date);

    return NextResponse.json(overview, {
      headers: {
        "Cache-Control": "s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to load rugby overview data.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 },
    );
  }
}
