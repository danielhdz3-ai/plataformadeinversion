import { cpRadiusSteps } from "@/lib/map/cp-zone-stock";

/** CP rurales / auditoría con stock bajo — scrape y tag más agresivos. */
export const RURAL_CP_PRIORITY = new Set([
  "05267",
  "39680",
  "18411",
  "21200",
  "25126",
  "42146",
  "09560",
  "15886",
  "15300",
  "40542",
  "50630",
  "24540",
  "47460",
  "09340",
  "44240",
]);

/** Capitales que en auditoría salen con 0 fresco sin re-scrape reciente. */
export const CP_STOCK_GAP_WATCH = new Set(["01001", "20001", "26001", "31001", "21001"]);

export function isAggressiveCpStock(cp: string | null | undefined): boolean {
  if (!cp || cp.length !== 5) return false;
  return RURAL_CP_PRIORITY.has(cp) || CP_STOCK_GAP_WATCH.has(cp);
}

export function cpStockBaseRadiusM(cp: string | null | undefined, defaultM = 5500): number {
  if (isAggressiveCpStock(cp)) return 9000;
  return defaultM;
}

/** Radios para tag_listings_postal_code tras importación. */
export function cpTagRadiusSteps(cp: string | null | undefined): number[] {
  const base = isAggressiveCpStock(cp) ? 5500 : 2800;
  return cpRadiusSteps(base);
}