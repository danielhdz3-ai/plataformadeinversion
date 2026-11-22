import { loadZoneOpportunityFeed } from "@/lib/opportunities/load-zone-feed.server";
import { circlePolygon } from "@/lib/map/circle-polygon";
import {
  geocodeSpainQuery,
  normalizeSpanishPostalCode,
  reverseGeocodeSpain,
  ZONE_STOCK_TARGET,
} from "@/lib/map/geocode-spain";
import {
  shouldOffloadCpScrapeToActions,
  triggerPostalCodeScrapeWorkflow,
} from "@/lib/scrape/trigger-cp-scrape-workflow.server";
import { prefetchScanZoneInventory } from "@/lib/scrape/prefetch-scan-zone.server";
import { portalsForCpLiveImport } from "@/lib/scrape/cp-live-portals";
import { refreshPostalCodeLive } from "@/lib/scrape/scrape-postal-code.server";
import {
  dbErrorFromUnknown,
  ensureSupabaseReachable,
  isLikelyUnreachable,
  unreachableSupabasePayload,
} from "@/lib/ops/db-api-errors";
import { probeSupabase } from "@/lib/ops/verify-supabase";
import { getDbClient, requireAppUser } from "@/lib/supabase/request-client";
import { after, NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 300;

const bodySchema = z.object({
  lat: z.number(),
  lng: z.number(),
  cp: z.string().optional(),
  radiusM: z.number().optional(),
  limit: z.number().optional(),
  live: z.boolean().optional(),
  /** Esperar scrape CP antes de responder (más lento, más stock). */
  waitScrape: z.boolean().optional(),
  chollosOnly: z.boolean().optional(),
  label: z.string().optional(),
});

async function resolveCp(lat: number, lng: number, cpHint?: string): Promise<string> {
  const normalized = cpHint ? normalizeSpanishPostalCode(cpHint.replace(/\D/g, "").slice(0, 5)) : null;
  if (normalized) return normalized;
  const rev = await reverseGeocodeSpain(lat, lng);
  const fromRev = rev?.label.match(/\b(\d{5})\b/)?.[1];
  if (fromRev) return fromRev;
  const hits = await geocodeSpainQuery(`${lat.toFixed(5)},${lng.toFixed(5)}`);
  const pc = hits[0]?.label.match(/\b(\d{5})\b/)?.[1];
  if (pc) return pc;
  throw new Error("No se pudo resolver código postal para esta zona");
}

export async function POST(req: NextRequest) {
  const auth = await requireAppUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error, code: "AUTH" }, { status: auth.status });
  }

  const reach = await ensureSupabaseReachable();
  if (!reach.ok) {
    return NextResponse.json(reach.body, { status: reach.status });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message, code: "VALIDATION" }, { status: 400 });
  }

  const { lat, lng, waitScrape, chollosOnly } = parsed.data;
  const limit = Math.min(200, parsed.data.limit ?? 200);
  const cp = await resolveCp(lat, lng, parsed.data.cp);
  const radiusM = parsed.data.radiusM ?? 6500;
  const live = parsed.data.live !== false;

  let scrapeMeta: Awaited<ReturnType<typeof refreshPostalCodeLive>> | null = null;
  let refreshStarted = false;

  const runBackgroundIngest = (offloadActions = false) => {
    refreshStarted = true;
    after(async () => {
      try {
        const portals = portalsForCpLiveImport();
        await refreshPostalCodeLive(cp, { portals, force: true });
        const polygon = circlePolygon(lng, lat, radiusM / 1000);
        await prefetchScanZoneInventory(polygon, {
          portals: [...portals, "hipoges", "solvia"],
          postalCode: cp,
        });
        if (
          offloadActions &&
          shouldOffloadCpScrapeToActions() &&
          !(globalThis as { __piCpWorkflow?: Set<string> }).__piCpWorkflow?.has(cp)
        ) {
          const g = globalThis as { __piCpWorkflow?: Set<string> };
          if (!g.__piCpWorkflow) g.__piCpWorkflow = new Set();
          g.__piCpWorkflow.add(cp);
          await triggerPostalCodeScrapeWorkflow(cp);
        }
      } catch (e) {
        console.error("zone opportunity ingest", e);
      }
    });
  };

  if (live && waitScrape) {
    try {
      scrapeMeta = await refreshPostalCodeLive(cp, {
        portals: portalsForCpLiveImport(),
        force: true,
      });
      const polygon = circlePolygon(lng, lat, radiusM / 1000);
      await prefetchScanZoneInventory(polygon, {
        portals: ["fotocasa", "pisos_com", "kelify", "hipoges", "solvia", "habitaclia"],
        postalCode: cp,
      });
    } catch (e) {
      scrapeMeta = { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  const supabase = await getDbClient();
  try {
    let feed = await loadZoneOpportunityFeed(supabase, {
      lat,
      lng,
      cp,
      radiusM,
      limit,
      chollosOnly: chollosOnly !== false,
    });

    if (live && waitScrape && feed.items.length < 15) {
      feed = await loadZoneOpportunityFeed(supabase, {
        lat,
        lng,
        cp,
        radiusM: Math.min(12_000, radiusM + 2000),
        limit,
        chollosOnly: chollosOnly !== false,
      });
    }

    const needsDeep = live && !waitScrape;
  if (needsDeep) {
      runBackgroundIngest(feed.totalInZone < ZONE_STOCK_TARGET);
    }

    return NextResponse.json({
      ...feed,
      center: { lat, lng },
      label: parsed.data.label ?? null,
      source: "zone" as const,
      liveImport: Boolean(waitScrape),
      refreshStarted: refreshStarted || needsDeep,
      scrape: scrapeMeta,
      totalQualified: feed.opportunitiesInZone,
      stockTarget: ZONE_STOCK_TARGET,
      stockSatisfied: feed.totalInZone >= ZONE_STOCK_TARGET,
    });
  } catch (e) {
    const message = dbErrorFromUnknown(e);
    if (isLikelyUnreachable(message)) {
      const probe = await probeSupabase();
      return NextResponse.json(unreachableSupabasePayload(probe), { status: 503 });
    }
    return NextResponse.json({ error: message, code: "DB" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireAppUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error, code: "AUTH" }, { status: auth.status });
  }

  const reach = await ensureSupabaseReachable();
  if (!reach.ok) {
    return NextResponse.json(reach.body, { status: reach.status });
  }

  const p = req.nextUrl.searchParams;
  const lat = Number(p.get("lat"));
  const lng = Number(p.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat/lng required", code: "VALIDATION" }, { status: 400 });
  }
  const cp = p.get("cp") ?? undefined;
  const radiusM = Number(p.get("radiusM") ?? "6500");
  const limit = Math.min(200, Number(p.get("limit") ?? "200"));
  const supabase = await getDbClient();
  const feed = await loadZoneOpportunityFeed(supabase, {
    lat,
    lng,
    cp: await resolveCp(lat, lng, cp ?? undefined),
    radiusM,
    limit,
  });
  return NextResponse.json({ ...feed, source: "zone", totalQualified: feed.opportunitiesInZone });
}
