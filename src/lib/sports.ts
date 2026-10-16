export type SportSlug = "football" | "cricket" | "basketball" | "rugby" | "f1";

export type SportItem = {
  slug: SportSlug;
  name: string;
  href: `/${SportSlug}`;
  subtitle: "Live scores & fixtures";
  image: {
    src: string;
    alt: string;
  };
};

export const sports: SportItem[] = [
  {
    slug: "football",
    name: "Football",
    href: "/football",
    subtitle: "Live scores & fixtures",
    image: {
      src: "https://i.pinimg.com/1200x/90/62/60/9062609af59abb8dbe594c8d1b3e439c.jpg",
      alt: "Football players contesting the ball in a match",
    },
  },
  {
    slug: "cricket",
    name: "Cricket",
    href: "/cricket",
    subtitle: "Live scores & fixtures",
    image: {
      src: "https://i.pinimg.com/1200x/c4/80/bd/c480bda6f7fefbe64ddee739cc4be29d.jpg",
      alt: "Cricket player in action during a match",
    },
  },
  {
    slug: "basketball",
    name: "Basketball",
    href: "/basketball",
    subtitle: "Live scores & fixtures",
    image: {
      src: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1400&q=80",
      alt: "Basketball game action near the hoop",
    },
  },
  {
    slug: "rugby",
    name: "Rugby",
    href: "/rugby",
    subtitle: "Live scores & fixtures",
    image: {
      src: "https://i.pinimg.com/1200x/30/e6/7f/30e67f83ccced914d4a126aaf90c8f78.jpg",
      alt: "Rugby players contesting possession on the field",
    },
  },
  {
    slug: "f1",
    name: "Formula 1",
    href: "/f1",
    subtitle: "Live scores & fixtures",
    image: {
      src: "https://images.unsplash.com/photo-1541773367336-d14f2e4d11cb?auto=format&fit=crop&w=1400&q=80",
      alt: "Formula race car speeding along a circuit",
    },
  },
];

export const sportNavigationItems: Array<{ label: string; href: "/" | `/${SportSlug}` }> = [
  { label: "All", href: "/" },
  ...sports.map((sport) => ({ label: sport.name, href: sport.href })),
];

export function getSportBySlug(slug: SportSlug): SportItem {
  return sports.find((sport) => sport.slug === slug) ?? sports[0];
}
