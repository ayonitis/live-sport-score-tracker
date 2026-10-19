import { NextRequest, NextResponse } from "next/server";
import { describeF1Error, getStandings, normalizeSeasonParam } from "@/lib/f1/service";

export async function GET(request: NextRequest) {
  const season = normalizeSeasonParam(request.nextUrl.searchParams.get("season"));
  if (!season || season === "current") {
    return NextResponse.json({ error: "A valid numeric season is required." }, { status: 400 });
  }

  try {
    const standings = await getStandings(season);
    return NextResponse.json(standings, { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=120" } });
  } catch (error) {
    return NextResponse.json({ error: "Unable to load F1 standings.", details: describeF1Error(error) }, { status: 502 });
  }
}
