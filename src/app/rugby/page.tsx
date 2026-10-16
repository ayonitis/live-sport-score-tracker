import { SportPageTemplate } from "@/components/sport-page-template";
import { getSportBySlug } from "@/lib/sports";

export default function RugbyPage() {
  return <SportPageTemplate sport={getSportBySlug("rugby")} />;
}
