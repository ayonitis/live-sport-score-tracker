import { RugbyDashboard } from "@/components/rugby/rugby-dashboard";
import { getRugbyOverviewSafe } from "@/lib/rugby/api-sports";

export const dynamic = "force-dynamic";

export default async function RugbyPage() {
  const overview = await getRugbyOverviewSafe();

  return <RugbyDashboard initialData={overview} />;
}
