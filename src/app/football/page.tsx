import { FootballDashboard } from "@/components/football/football-dashboard";
import { getFootballOverview } from "@/lib/football/sportscore";

export const dynamic = "force-dynamic";

export default async function FootballPage() {
  const overview = await getFootballOverview();

  return <FootballDashboard initialData={overview} />;
}
