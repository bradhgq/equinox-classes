// A tiny DataIndex for unit tests: New York (two areas) and Boston (no areas).
import type { Club, DataIndex } from "../../../shared/schema.ts";
import { buildCatalog } from "./catalog.ts";

const club = (id: string, slug: string, name: string, city: string, area: string | null, classCount = 100): Club => ({
  id,
  slug,
  name,
  fullName: `Equinox ${name}`,
  shortName: name,
  city,
  area,
  town: null,
  timeZone: city === "boston" ? "America/New_York" : "America/New_York",
  clubType: "Regular",
  address: null,
  lat: null,
  lon: null,
  classCount,
  firstDate: "2026-10-04",
  lastDate: "2026-10-24",
});

export const INDEX: DataIndex = {
  version: 1,
  generatedAt: "2026-10-04T22:00:00.000Z",
  horizon: { start: "2026-10-04", end: "2026-10-24" },
  categories: [
    { id: 6, name: "Cycling", slug: "cycling" },
    { id: 104, name: "Yoga", slug: "yoga" },
  ],
  cities: [
    {
      slug: "new-york",
      name: "New York",
      areas: [
        { slug: "new-york-downtown", name: "Downtown", clubIds: ["112", "113"] },
        { slug: "new-york-midtown", name: "Midtown", clubIds: ["138"] },
      ],
      clubIds: ["112", "113", "138"],
    },
    { slug: "boston", name: "Boston", areas: [], clubIds: ["204", "205"] },
  ],
  clubs: [
    club("112", "greenwich-avenue", "Greenwich Ave", "new-york", "new-york-downtown"),
    club("113", "soho", "SoHo", "new-york", "new-york-downtown"),
    club("138", "hudson-yards", "Hudson Yards", "new-york", "new-york-midtown"),
    club("204", "back-bay", "Back Bay", "boston", null),
    club("205", "chestnut-hill", "Chestnut Hill", "boston", null),
  ],
  families: [
    { key: "beats-ride", name: "Beats Ride", categoryId: 6, count: 90, clubCount: 3, variants: ["Beats Ride"] },
    { key: "theme-ride", name: "Theme Ride", categoryId: 6, count: 4, clubCount: 2, variants: ["THEME RIDE: Y2K"] },
    { key: "vinyasa-yoga", name: "Vinyasa Yoga", categoryId: 104, count: 80, clubCount: 5, variants: ["Vinyasa Yoga"] },
    { key: "power-vinyasa", name: "Power Vinyasa", categoryId: 104, count: 30, clubCount: 4, variants: ["Power Vinyasa"] },
  ],
};

export const catalog = buildCatalog(INDEX);
