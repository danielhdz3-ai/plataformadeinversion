import type { GeocodeHit } from "@/lib/map/geocode-spain";

const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 8000;

type Entry = { hits: GeocodeHit[]; exp: number };

const store = new Map<string, Entry>();

function normKey(q: string) {
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}

export function getCachedGeocodeHits(q: string): GeocodeHit[] | null {
  const key = normKey(q);
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() > hit.exp) {
    store.delete(key);
    return null;
  }
  return hit.hits;
}

export function setCachedGeocodeHits(q: string, hits: GeocodeHit[]) {
  if (!hits.length) return;
  const key = normKey(q);
  if (store.size >= MAX_ENTRIES) {
    const first = store.keys().next().value;
    if (first) store.delete(first);
  }
  store.set(key, { hits, exp: Date.now() + TTL_MS });
}

export function getCachedPostalHit(postal: string): GeocodeHit | null {
  const key = `cp:${postal}`;
  const hit = store.get(key);
  if (!hit || Date.now() > hit.exp) return null;
  return hit.hits[0] ?? null;
}

export function setCachedPostalHit(postal: string, hit: GeocodeHit) {
  const key = `cp:${postal}`;
  store.set(key, { hits: [hit], exp: Date.now() + TTL_MS });
  setCachedGeocodeHits(postal, [hit]);
}