/**
 * Objetivo: cientos de ventas activas por CP en Supabase (todos los portales activos).
 */
import { getSupabase } from "./env.mjs";
import { resolveZonesForPostalCode } from "./resolve-zones-for-postal-code.mjs";
import { fetchFotocasaListPage } from "./fotocasa-api.mjs";
import { runPisosSale } from "./run-pisos-scrape.mjs";
import { geocodeSpain } from "./geocode-es.mjs";
import { dryRun } from "./env.mjs";
import { normalizeIngestPortals } from "./all-portals.mjs";
import { ingestExtraPortals } from "./ingest-extra-portals.mjs";
import { tagListingsForPostalCode } from "./tag-listings-for-cp.mjs";

const PORTAL = "fotocasa";
const TARGET = Number(process.env.SCRAPE_TARGET_PER_CP ?? "200");
const MIN_PER_PORTAL = Number(process.env.SCRAPE_CP_MIN_PER_PORTAL ?? "15");
const MAX_BOOST = Number(process.env.SCRAPE_CP_BOOST_ROUNDS ?? "3");

function normalizeCp(v) {
  const s = String(v ?? "").replace(/\D/g, "").slice(0, 5);
  return s.length === 5 ? s : null;
}

function cpMatches(listingCp, targetCp) {
  const a = normalizeCp(listingCp);
  const b = normalizeCp(targetCp);
  return a != null && b != null && a === b;
}

async function countActiveByCp(supabase, postalCode) {
  const { count, error } = await supabase
    .from("listings")
    .select("*", { count: "exact", head: true })
    .eq("status", "active")
    .eq("operation", "sale")
    .eq("postal_code", postalCode);
  if (error) throw error;
  return count ?? 0;
}

async function countByCpPortal(supabase, postalCode) {
  const { data, error } = await supabase
    .from("listings")
    .select("source_portal")
    .eq("status", "active")
    .eq("operation", "sale")
    .eq("postal_code", postalCode);
  if (error) throw error;
  const out = {};
  for (const row of data ?? []) {
    const p = row.source_portal ?? "unknown";
    out[p] = (out[p] ?? 0) + 1;
  }
  return out;
}

function needsMoreScrape(total, byPortal, portals, target, minPerPortal) {
  if (total < target) return true;
  for (const p of portals) {
    if (p === "idealista") continue;
    if ((byPortal[p] ?? 0) < minPerPortal) return true;
  }
  return false;
}

async function upsertFotocasaListing(supabase, mapped, zone, anchor, postalCode) {
  if (!mapped.externalId || mapped.price == null) return false;
  if (!cpMatches(mapped.postalCode, postalCode)) return false;

  let lon = mapped.lon;
  let lat = mapped.lat;
  let geocodeQuality = lon != null && lat != null ? 3 : 4;
  if ((lon == null || lat == null) && anchor) {
    lon = anchor.lng;
    lat = anchor.lat;
    geocodeQuality = 5;
  } else if (lon == null || lat == null) {
    const geo = await geocodeSpain(`${postalCode}, ${zone.name ?? ""}, España`);
    if (geo) {
      lon = geo.lon;
      lat = geo.lat;
      geocodeQuality = 5;
    }
  }
  if (lon == null || lat == null) return false;

  const payload = {
    source_portal: PORTAL,
    source_external_id: mapped.externalId,
    operation: "sale",
    title: mapped.title,
    price: mapped.price,
    sqm: mapped.sqm != null ? Number(mapped.sqm) : null,
    bedrooms: mapped.bedrooms != null ? Number(mapped.bedrooms) : null,
    bathrooms: mapped.bathrooms != null ? Number(mapped.bathrooms) : null,
    city: mapped.city ?? zone.name,
    ccaa: zone.ccaa,
    postal_code: postalCode,
    source_url: mapped.sourceUrl,
    thumbnail_url: mapped.thumbnail,
    status: "active",
    geocode_quality: geocodeQuality,
    scraped_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
  };

  if (dryRun()) return true;

  const { data: upserted, error } = await supabase
    .from("listings")
    .upsert(payload, { onConflict: "source_portal,source_external_id" })
    .select("id")
    .maybeSingle();
  if (error || !upserted?.id) return false;
  await supabase.rpc("patch_listing_geom", { listing_id: upserted.id, lon, lat });
  return true;
}

async function scrapeFotocasaForCp(supabase, resolved, postalCode) {
  const maxPages = Number(process.env.SCRAPE_CP_FOTOCASA_PAGES ?? "24");
  const anchor = resolved.center;
  let inserted = 0;
  let cards = 0;

  for (const zone of resolved.fotocasaZones) {
    let empty = 0;
    for (let page = 1; page <= maxPages; page++) {
      const inDb = await countActiveByCp(supabase, postalCode);
      if (inDb >= TARGET) break;

      const { listings } = await fetchFotocasaListPage(zone.slug, page);
      if (listings.length === 0) {
        empty++;
        if (empty >= 2) break;
        continue;
      }
      empty = 0;
      cards += listings.length;

      for (const mapped of listings) {
        if (await upsertFotocasaListing(supabase, mapped, zone, anchor, postalCode)) {
          inserted++;
        }
      }
    }
    const inDb = await countActiveByCp(supabase, postalCode);
    if (inDb >= TARGET) break;
  }

  return { inserted, cards };
}

async function scrapePisosForCp(resolved, postalCode) {
  const citySlug = resolved.anchorCity?.citySlug;
  if (!citySlug) return { inserted: 0, ok: false, reason: "no_city" };

  const maxListings = Number(process.env.SCRAPE_CP_PISOS_MAX ?? "400");
  const maxPages = Number(process.env.SCRAPE_CP_PISOS_PAGES ?? "28");
  const anchor = resolved.center;
  let inserted = 0;
  const districts = resolved.zones.filter((z) => z.pisosDistrict || z.slug?.includes("/"));
  const targets =
    districts.length > 0
      ? districts
      : [{ pisosDistrict: null, slug: resolved.anchorCity.slug }];

  for (const z of targets) {
    const district = z.pisosDistrict ?? z.slug?.split("/")?.pop() ?? null;
    try {
      const r = await runPisosSale(citySlug, {
        district,
        maxListings,
        maxPages,
        fallbackLng: anchor.lng,
        fallbackLat: anchor.lat,
        postalCodeTarget: postalCode,
      });
      inserted += r?.inserted ?? 0;
    } catch (e) {
      console.warn("pisos cp", district, e instanceof Error ? e.message : e);
    }
    const supabase = getSupabase();
    const inDb = await countActiveByCp(supabase, postalCode);
    if (inDb >= TARGET) break;
  }

  return { inserted };
}

export async function scrapeByPostalCode(postalCode, options = {}) {
  const cp = normalizeCp(postalCode);
  if (!cp) throw new Error(`CP inválido: ${postalCode}`);

  const supabase = getSupabase();
  const target = Number(options.target ?? TARGET);
  const before = await countActiveByCp(supabase, cp);
  if (before >= target && !options.force) {
    return { ok: true, postalCode: cp, skipped: true, countBefore: before, countAfter: before, target };
  }

  process.env.SCAN_CP_SKIP_PLAYWRIGHT = "1";
  if (!process.env.SCAN_HIPOGES_MAX_PAGES) process.env.SCAN_HIPOGES_MAX_PAGES = "10";
  if (!process.env.SCAN_SOLVIA_MAX_PAGES) process.env.SCAN_SOLVIA_MAX_PAGES = "6";
  const portals = normalizeIngestPortals(options.portals);
  const resolved = await resolveZonesForPostalCode(cp);
  const fotocasa = await scrapeFotocasaForCp(supabase, resolved, cp);
  const pisos = await scrapePisosForCp(resolved, cp);
  let extra = await ingestExtraPortals({
    portals,
    cityZone: resolved.anchorCity,
    resolved,
    postalCode: cp,
    anchor: resolved.center,
  });

  let boost = 0;
  while (boost < MAX_BOOST) {
    const inDb = await countActiveByCp(supabase, cp);
    const byPortal = await countByCpPortal(supabase, cp);
    if (!needsMoreScrape(inDb, byPortal, portals, target, MIN_PER_PORTAL)) break;
    boost++;
    process.env.SCRAPE_CP_PISOS_MAX = String(450 + boost * 150);
    process.env.SCRAPE_CP_FOTOCASA_PAGES = String(28 + boost * 8);
    process.env.SCAN_HIPOGES_MAX_PAGES = String(20 + boost * 6);
    process.env.SCAN_SOLVIA_MAX_PAGES = String(10 + boost * 4);
    await scrapeFotocasaForCp(supabase, resolved, cp);
    await scrapePisosForCp(resolved, cp);
    extra = await ingestExtraPortals({
      portals,
      cityZone: resolved.anchorCity,
      resolved,
      postalCode: cp,
      anchor: resolved.center,
    });
  }

  const tagged = await tagListingsForPostalCode(cp, { center: resolved.center });

  const countAfter = await countActiveByCp(supabase, cp);
  const byPortalAfter = await countByCpPortal(supabase, cp);

  return {
    ok: true,
    postalCode: cp,
    countBefore: before,
    countAfter,
    byPortal: byPortalAfter,
    target,
    minPerPortal: MIN_PER_PORTAL,
    meetsTarget:
      countAfter >= target &&
      portals.every(
        (p) => p === "idealista" || (byPortalAfter[p] ?? 0) >= MIN_PER_PORTAL
      ),
    districts: resolved.zones.map((z) => z.slug),
    portals,
    fotocasa,
    pisos,
    extra,
    tagged,
    boostRounds: boost,
  };
}
