import { BasketballDashboard } from "@/components/basketball/basketball-dashboard";
import { getBasketballOverview, getFallbackBasketballOverview } from "@/lib/basketball/sportscore";

export const dynamic = "force-dynamic";

export default async function BasketballPage() {
  let overview;

  try {
    overview = await getBasketballOverview();
  } catch (error) {
    overview = getFallbackBasketballOverview(
      error instanceof Error ? error.message : "Unable to reach SportScore basketball feed.",
    );
  }

  return <BasketballDashboard initialData={overview} />;
}
