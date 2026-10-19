import { NextRequest, NextResponse } from "next/server";
import { describeF1Error, getSeasonCalendar, normalizeSeasonParam } from "@/lib/f1/service";

export async function GET(request: NextRequest) {
  const season = normalizeSeasonParam(request.nextUrl.searchParams.get("season") ?? "current");
  if (!season) {
    return NextResponse.json({ error: "Invalid season." }, { status: 400 });
  }

  try {
    const calendar = await getSeasonCalendar(season);
    return NextResponse.json(calendar, { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" } });
  } catch (error) {
    return NextResponse.json({ error: "Unable to load the F1 calendar.", details: describeF1Error(error) }, { status: 502 });
  }
}
