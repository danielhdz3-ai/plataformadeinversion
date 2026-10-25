import { decodeListingTitle } from "@/lib/decode-html";
import { resolveListingSqm } from "@/lib/listing/resolve-sqm";
import { resolveListingGrossRoiPct } from "@/lib/listing/gross-roi";
import { resolveRentEstMonthly } from "@/lib/listing/rent-est";
import { isResidentialPropertyKind } from "@/lib/listing/residential-kind";
import { interleaveByPortal } from "@/lib/map/balance-listings-by-portal";
import { geocodeSpainQuery } from "@/lib/map/geocode-spain";
import { portalsForCpLiveImport } from "@/lib/scrape/cp-live-portals";
import { refreshPostalCodeLive } from "@/lib/scrape/scrape-postal-code.server";
import { fetchListingRowsInChunks } from "@/lib/supabase/fetch-in-chunks";
import { getDbClient, requireAppUser } from "@/lib/supabase/request-client";
import { after, NextRequest, NextResponse } from "next/server";

/** Importación en vivo por CP (España) — puede tardar varios minutos. */
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const auth = await requireAppUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error, code: "AUTH" }, { status: auth.status });
  }

  const cp = req.nextUrl.searchParams.get("cp")?.trim() ?? "";
  if (!/^(0[1-9]\d{3}|[1-4]\d{4}|5[0-2]\d{3})$/.test(cp)) {
    return NextResponse.json({ error: "CP inválido", code: "VALIDATION" }, { status: 400 });
  }

  const live = req.nextUrl.searchParams.get("live") !== "0";
  const waitForScrape = req.nextUrl.searchParams.get("wait") !== "0";
  const maxRows = Number(req.nextUrl.searchParams.get("max") ?? "800");
  const radiusM = Number(req.nextUrl.searchParams.get("radiusM") ?? "2800");

  const hits = await geocodeSpainQuery(cp);
  const center = hits[0];
  if (!center) {
    return NextResponse.json({ error: "No se pudo geolocalizar el CP", code: "GEOCODE" }, { status: 404 });
  }

  let scrapeMeta: Awaited<ReturnType<typeof refreshPostalCodeLive>> | null = null;
  let refreshStarted = false;

  if (live && !waitForScrape) {
    refreshStarted = true;
    const portals = portalsForCpLiveImport();
    after(async () => {
      try {
        await refreshPostalCodeLive(cp, { portals, force: true });
      } catch (e) {
        console.error("cp scrape background", cp, e);
      }
    });
  } else if (live && waitForScrape) {
    try {
      const portals = portalsForCpLiveImport();
      scrapeMeta = await refreshPostalCodeLive(cp, { portals, force: true });
      if (scrapeMeta.error && !scrapeMeta.ok) {
        return NextResponse.json(
          { error: scrapeMeta.error, code: "SCRAPE", postalCode: cp },
          { status: 502 }
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: msg, code: "SCRAPE", postalCode: cp }, { status: 502 });
    }
  }

  const supabase = await getDbClient();

  const freshQuery = supabase
    .from("listings")
    .select("id, property_kind")
    .eq("status", "active")
    .eq("operation", "sale")
    .eq("postal_code", cp)
    .not("geom", "is", null)
    .limit(maxRows);

  const { data: freshRows, error: freshErr } = await freshQuery;

  let rowsForIds = freshRows;
  if (freshErr) {
    if (/last_seen_at/i.test(freshErr.message)) {
      const { data: fallbackRows } = await supabase
        .from("listings")
        .select("id, property_kind")
        .eq("status", "active")
        .eq("operation", "sale")
        .eq("postal_code", cp)
        .not("geom", "is", null)
        .limit(maxRows);
      rowsForIds = fallbackRows;
    } else {
      return NextResponse.json({ error: freshErr.message, code: "DB" }, { status: 500 });
    }
  }

  const freshIds = new Set(
    (rowsForIds ?? [])
      .filter((r) => isResidentialPropertyKind(r.property_kind))
      .map((r) => r.id)
  );

  type RpcRow = {
    id: string;
    price: number;
    roi_gross: number | null;
    lng: number;
    lat: number;
    geocode_quality: number | null;
    rent_confidence: string | null;
    source_portal: string;
    postal_code: string | null;
  };

  const merged = new Map<string, RpcRow>();
  const portals = [
    "fotocasa",
    "pisos_com",
    "kelify",
    "habitaclia",
    "hipoges",
    "solvia",
    "idealista",
  ] as const;

  for (const portal of portals) {
    const { data, error } = await supabase.rpc("listings_for_postal_code", {
      p_cp: cp,
      p_lng: center.lng,
      p_lat: center.lat,
      p_radius_m: radiusM,
      max_rows: Math.ceil(maxRows / portals.length) + 50,
      portal_filter: portal,
    });
    if (error) {
      if (/listings_for_postal_code|function/i.test(error.message)) {
        return NextResponse.json(
          { error: "Función CP no desplegada", code: "MIGRATION" },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: error.message, code: "DB" }, { status: 500 });
    }
    for (const row of (data ?? []) as RpcRow[]) {
      if (freshIds.has(row.id)) merged.set(row.id, row);
    }
  }

  const rows = [...merged.values()].slice(0, maxRows);
  const ids = rows.map((r) => r.id);

  type MetaRow = {
    id: string;
    title: string | null;
    source_url: string | null;
    city: string | null;
    thumbnail_url: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    sqm: number | null;
    scraped_at: string | null;
    listing_investment:
      | { rent_est: number | null; rent_confidence: string | null }
      | { rent_est: number | null; rent_confidence: string | null }[]
      | null;
  };

  let meta: MetaRow[] = [];
  if (ids.length > 0) {
    meta = await fetchListingRowsInChunks<MetaRow>(
      supabase,
      "listings",
      "id, title, source_url, city, thumbnail_url, bedrooms, bathrooms, sqm, scraped_at, listing_investment(rent_est, rent_confidence)",
      ids
    );
  }
  const metaMap = new Map(meta.map((m) => [m.id, m]));

  const features = rows.map((row) => {
    const m = metaMap.get(row.id);
    const inv = m?.listing_investment;
    const invRow = Array.isArray(inv) ? inv[0] : inv;
    const rentRaw = invRow?.rent_est != null ? Number(invRow.rent_est) : null;
    const rent = resolveRentEstMonthly(row.price, rentRaw);
    const roi = resolveListingGrossRoiPct(row.price, rent, row.roi_gross);
    return {
      id: row.id,
      lng: row.lng,
      lat: row.lat,
      roi,
      price: row.price,
      geocodeQuality: row.geocode_quality,
      rentConfidence: row.rent_confidence ?? invRow?.rent_confidence ?? null,
      source: row.source_portal,
      postalCode: row.postal_code,
      title: decodeListingTitle(m?.title ?? null),
      sourceUrl: m?.source_url ?? null,
      city: m?.city ?? null,
      thumbnailUrl: m?.thumbnail_url ?? null,
      bedrooms: m?.bedrooms ?? null,
      bathrooms: m?.bathrooms ?? null,
      sqm: resolveListingSqm(m?.sqm ?? null, m?.title ?? null),
      rentEst: rent,
      scrapedAt: m?.scraped_at ?? null,
    };
  });

  const byPortal: Record<string, number> = {};
  for (const f of features) {
    const k = f.source ?? "unknown";
    byPortal[k] = (byPortal[k] ?? 0) + 1;
  }

  return NextResponse.json({
    postalCode: cp,
    center: { lat: center.lat, lng: center.lng },
    liveImport: live && waitForScrape,
    refreshStarted,
    scrape: scrapeMeta,
    total: features.length,
    byPortal,
    features: interleaveByPortal(features, (f) => f.source),
  });
}
