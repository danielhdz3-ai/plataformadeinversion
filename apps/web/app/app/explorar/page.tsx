"use client";

import {
  ListingDetailSidePanel,
  type SidePanelListing,
} from "@/components/listings/ListingDetailSidePanel";
import { PremiumListingCard } from "@/components/listings/PremiumListingCard";
import { pinFallbackListing } from "@/lib/listing/resolve-side-panel-listing";
import { useListingSummaries } from "@/lib/listing/use-listing-summaries";
import { RoiScanMap } from "@/components/map/RoiScanMapLazy";
import type { MapFeatureCollection } from "@/lib/map/geojson-types";
import { SPAIN_VIEW } from "@/lib/map/spain-bounds";
import { decodeListingTitle } from "@/lib/decode-html";
import { AppPanelHeader } from "@/components/app/AppPanelHeader";
import Link from "next/link";
import { portalBadge } from "@/lib/portals";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

type ListingPin = {
  id: string;
  lng: number;
  lat: number;
  roi: number | null;
  price: number;
  source: string | null;
  title: string | null;
  sourceUrl: string | null;
  city?: string | null;
  thumbnailUrl?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  sqm?: number | null;
  rentEst?: number | null;
  rentConfidence?: string | null;
  geocodeQuality?: number | null;
};

function ExplorarPageContent() {
  const searchParams = useSearchParams();
  const [listings, setListings] = useState<ListingPin[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const lastBboxRef = useRef<[number, number, number, number] | null>(null);
  const [requestSent, setRequestSent] = useState(false);
  const [summaryMode, setSummaryMode] = useState<"whole" | "rooms">("whole");
  const [showIneLayer, setShowIneLayer] = useState(false);
  const [censusOverlay, setCensusOverlay] = useState<MapFeatureCollection | null>(null);
  const lastZoomRef = useRef(12);
  const [cpQuery, setCpQuery] = useState("");
  const [cpLoading, setCpLoading] = useState(false);
  const [cpSummary, setCpSummary] = useState<string | null>(null);
  const [flyTo, setFlyTo] = useState<{ center: [number, number]; zoom: number } | null>(null);

  useEffect(() => {
    const lid = searchParams.get("listing");
    if (lid) setSelected(lid);
  }, [searchParams]);

  const explorarReturnTo = useMemo(
    () => (selected ? `/app/explorar?listing=${selected}` : "/app/explorar"),
    [selected]
  );

  const loadCensus = useCallback(
    async (bbox: [number, number, number, number], zoom: number) => {
      if (!showIneLayer || zoom < 11) {
        setCensusOverlay(null);
        return;
      }
      const [minLng, minLat, maxLng, maxLat] = bbox;
      const res = await fetch(
        `/api/map/census-sections?minLng=${minLng}&minLat=${minLat}&maxLng=${maxLng}&maxLat=${maxLat}&zoom=${zoom}`
      );
      if (!res.ok) {
        setCensusOverlay(null);
        return;
      }
      const data = (await res.json()) as MapFeatureCollection;
      setCensusOverlay(data.features?.length ? data : null);
    },
    [showIneLayer]
  );

  const loadByPostalCode = useCallback(async () => {
    const cp = cpQuery.replace(/\D/g, "").slice(0, 5);
    if (cp.length !== 5) return;
    setCpLoading(true);
    setCpSummary(null);
    try {
      const applyPayload = (data: {
        features?: ListingPin[];
        total?: number;
        byPortal?: Record<string, number>;
        center?: { lat: number; lng: number };
      }) => {
        const feats = data.features ?? [];
        setListings(feats);
        if (data.center) {
          setFlyTo({ center: [data.center.lng, data.center.lat], zoom: 14 });
        }
        const parts = data.byPortal
          ? Object.entries(data.byPortal)
              .sort((a, b) => b[1] - a[1])
              .map(([p, n]) => `${p} ${n}`)
              .join(" · ")
          : "";
        setCpSummary(
          `${data.total ?? feats.length} ventas CP ${cp}${parts ? ` · ${parts}` : ""}`
        );
      };

      setCpSummary("Importando portales en segundo plano…");
      const kick = await fetch(`/api/map/listings-by-cp?cp=${cp}&max=800&live=1&wait=0`);
      const kickData = (await kick.json()) as {
        features?: ListingPin[];
        total?: number;
        byPortal?: Record<string, number>;
        center?: { lat: number; lng: number };
        error?: string;
        refreshStarted?: boolean;
      };
      if (!kick.ok) {
        setCpSummary(kickData.error ?? "Error al cargar CP");
        return;
      }
      applyPayload(kickData);

      if (kickData.refreshStarted) {
        let lastTotal = kickData.total ?? 0;
        for (let i = 0; i < 24; i++) {
          await new Promise((r) => setTimeout(r, 15_000));
          setCpSummary(`Importando portales… (${(i + 1) * 15}s)`);
          const poll = await fetch(`/api/map/listings-by-cp?cp=${cp}&max=800&live=0`);
          const pollData = (await poll.json()) as typeof kickData;
          if (!poll.ok) continue;
          applyPayload(pollData);
          const t = pollData.total ?? 0;
          if (t > lastTotal + 5) lastTotal = t;
          if (i >= 3 && t >= 40) break;
        }
        setCpSummary(`${lastTotal}+ ventas CP ${cp} · importación en curso en servidor`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      setCpSummary(msg);
    } finally {
      setCpLoading(false);
    }
  }, [cpQuery]);

  const loadMap = useCallback(
    async (bbox: [number, number, number, number], meta?: { zoom: number }) => {
      lastBboxRef.current = bbox;
      const zoom = meta?.zoom ?? lastZoomRef.current;
      if (meta?.zoom != null) lastZoomRef.current = meta.zoom;
      const [minLng, minLat, maxLng, maxLat] = bbox;
      const zoomQ = meta?.zoom != null ? `&zoom=${meta.zoom}` : "";
      const res = await fetch(
        `/api/map/listings?minLng=${minLng}&minLat=${minLat}&maxLng=${maxLng}&maxLat=${maxLat}${zoomQ}`
      );
      if (res.ok) {
        const data = (await res.json()) as { features: ListingPin[] };
        setListings(data.features ?? []);
      }
      void loadCensus(bbox, zoom);
    },
    [loadCensus]
  );

  useEffect(() => {
    const bbox = lastBboxRef.current;
    if (bbox) void loadCensus(bbox, lastZoomRef.current);
  }, [showIneLayer, loadCensus]);

  const portalSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of listings) {
      const key = l.source ?? "unknown";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    const parts = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([key, n]) => `${portalBadge(key).name} ${n}`);
    return parts.length > 0 ? parts.join(" · ") : null;
  }, [listings]);

  async function requestCoverage() {
    const bbox = lastBboxRef.current;
    if (!bbox) return;
    const [minLng, minLat, maxLng, maxLat] = bbox;
    const res = await fetch("/api/map/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minLng, minLat, maxLng, maxLat, note: "Explorar sin pins" }),
    });
    if (res.ok) setRequestSent(true);
  }

  const listingIds = useMemo(() => {
    const ids = listings.map((l) => l.id);
    if (selected && !ids.includes(selected)) ids.push(selected);
    return ids;
  }, [listings, selected]);
  const { summaries, loading: summariesLoading } = useListingSummaries(listingIds, {
    mode: summaryMode,
    detailId: selected,
  });

  const roiPins = useMemo(
    () =>
      listings.map((l) => ({
        id: l.id,
        lng: l.lng,
        lat: l.lat,
        roi: l.roi,
        price: l.price,
        rentEst: l.rentEst ?? null,
        rentConfidence: l.rentConfidence ?? null,
        geocodeQuality: l.geocodeQuality ?? null,
      })),
    [listings]
  );

  const selectedListing = useMemo((): SidePanelListing | null => {
    if (!selected) return null;
    const l = listings.find((x) => x.id === selected);
    if (l) {
      return {
        id: l.id,
        title: l.title,
        price: l.price,
        city: l.city,
        sourcePortal: l.source,
        thumbnailUrl: l.thumbnailUrl,
        bedrooms: l.bedrooms,
        bathrooms: l.bathrooms,
        sqm: l.sqm,
        roi: l.roi,
        rentEst: l.rentEst ?? null,
        sourceUrl: l.sourceUrl,
      };
    }
    const pin = roiPins.find((p) => p.id === selected);
    if (pin) return pinFallbackListing(selected, pin);
    return null;
  }, [selected, listings, roiPins]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
      <aside className="flex min-h-0 w-full shrink-0 flex-col border-r border-neutral-200 bg-[#f7f6f3] lg:w-[min(380px,34vw)]">
        <AppPanelHeader
          title="Explorar mercado"
          subtitle={
            listings.length === 0
              ? "Acerca el mapa a una ciudad con cobertura"
              : `${listings.length} ventas activas${portalSummary ? ` · ${portalSummary}` : ""}`
          }
          action={
            <Link
              href="/app/scan/nuevo"
              className="inline-block rounded bg-neutral-950 px-3 py-1.5 text-xs font-medium text-white"
            >
              Nuevo scan ROI
            </Link>
          }
        />
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              placeholder="CP (ej. 28033)"
              value={cpQuery}
              onChange={(e) => setCpQuery(e.target.value.replace(/\D/g, "").slice(0, 5))}
              className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={cpQuery.length !== 5 || cpLoading}
              onClick={() => void loadByPostalCode()}
              className="shrink-0 rounded-lg bg-neutral-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-40"
            >
              {cpLoading ? "Importando…" : "Buscar CP"}
            </button>
          </div>
          {cpSummary && (
            <p className="text-xs text-neutral-700">
              {cpSummary} — scrape en vivo (España), no inventario antiguo
            </p>
          )}
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-800">
            <input
              type="checkbox"
              checked={showIneLayer}
              onChange={(e) => setShowIneLayer(e.target.checked)}
              className="accent-violet-700"
            />
            Capa INE (secciones censales) — zoom ≥ 11 · piloto Barcelona
          </label>
          {listings.length === 0 && (
            <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
              <p>
                Acerca el mapa a una ciudad con cobertura (leyenda abajo) o desplázate por España. Si no hay
                pins, estamos ampliando scrape en esa zona.
              </p>
              <button
                type="button"
                disabled={requestSent}
                onClick={() => void requestCoverage()}
                className="mt-3 rounded-lg border border-neutral-950 bg-neutral-950 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                {requestSent ? "Solicitud enviada" : "Solicitar datos en esta zona"}
              </button>
            </div>
          )}
          {listings.map((l) => (
            <PremiumListingCard
              key={l.id}
              listingId={l.id}
              title={decodeListingTitle(l.title ?? "Inmueble")}
              city={l.city}
              price={l.price}
              sourcePortal={l.source}
              thumbnailUrl={l.thumbnailUrl}
              bedrooms={l.bedrooms}
              bathrooms={l.bathrooms}
              sqm={l.sqm}
              roi={l.roi}
              rentEst={l.rentEst}
              sourceUrl={l.sourceUrl ?? undefined}
              selected={selected === l.id}
              onHover={() => setSelected(l.id)}
              onSelect={() => setSelected(l.id)}
              compact
              summary={summaries[l.id] ?? null}
              summaryLoading={summariesLoading}
              returnTo={explorarReturnTo}
            />
          ))}
        </div>
      </aside>
      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
        <RoiScanMap
          pins={roiPins}
          selectedId={selected}
          onSelectPin={setSelected}
          onBboxChange={loadMap}
          flyTo={flyTo}
          initialView={SPAIN_VIEW}
          maxPins={200}
          censusOverlay={censusOverlay}
          className="absolute inset-0 h-full w-full"
        />
      </div>
      {selected && selectedListing && (
        <button
          type="button"
          aria-label="Cerrar panel"
          className="fixed inset-0 z-30 bg-black/25 xl:hidden"
          onClick={() => setSelected(null)}
        />
      )}
      <ListingDetailSidePanel
        summaryMode={summaryMode}
        onSummaryModeChange={setSummaryMode}
        listing={selectedListing}
        summary={selected ? (summaries[selected] ?? null) : null}
        summaryLoading={summariesLoading}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

export default function ExplorarPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center p-8 text-sm text-neutral-600">Cargando explorar…</div>}>
      <ExplorarPageContent />
    </Suspense>
  );
}
