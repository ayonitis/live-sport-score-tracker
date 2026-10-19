import { NextRequest, NextResponse } from "next/server";
import { describeF1Error, getRoundResults, normalizeRoundParam, normalizeSeasonParam } from "@/lib/f1/service";

export async function GET(request: NextRequest) {
  const season = normalizeSeasonParam(request.nextUrl.searchParams.get("season"));
  const round = normalizeRoundParam(request.nextUrl.searchParams.get("round"));

  if (!season || season === "current" || round === null) {
    return NextResponse.json({ error: "A valid numeric season and round are required." }, { status: 400 });
  }

  try {
    const results = await getRoundResults(season, round);
    return NextResponse.json(results, { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=120" } });
  } catch (error) {
    return NextResponse.json({ error: "Unable to load F1 results.", details: describeF1Error(error) }, { status: 502 });
  }
}
