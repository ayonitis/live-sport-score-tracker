import { F1Dashboard } from "@/components/f1/f1-dashboard";
import { getF1InitialData } from "@/lib/f1/service";

export const dynamic = "force-dynamic";

export default async function F1Page() {
  const initialData = await getF1InitialData();

  return <F1Dashboard initialData={initialData} />;
}
