import { CricketDashboard } from "@/components/cricket/cricket-dashboard";
import { getCricketOverview, getFallbackCricketOverview } from "@/lib/cricket/sportscore";

export const dynamic = "force-dynamic";

export default async function CricketPage() {
  let overview;

  try {
    overview = await getCricketOverview();
  } catch (error) {
    overview = getFallbackCricketOverview(
      error instanceof Error ? error.message : "Unable to reach SportScore cricket feed.",
    );
  }

  return <CricketDashboard initialData={overview} />;
}
