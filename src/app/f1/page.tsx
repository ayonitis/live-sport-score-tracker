import { SportPageTemplate } from "@/components/sport-page-template";
import { getSportBySlug } from "@/lib/sports";

export default function F1Page() {
  return <SportPageTemplate sport={getSportBySlug("f1")} />;
}
