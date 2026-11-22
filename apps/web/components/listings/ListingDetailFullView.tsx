"use client";

import { ListingAiAnalysisBlock } from "@/components/listings/ListingAiAnalysisBlock";
import { InteractiveMarketChart } from "@/components/listings/InteractiveMarketChart";
import {
  OpportunityScoreBadge,
  SellerKindBadge,
  ValuationSnippet,
} from "@/components/listings/OpportunityBadges";
import { ListingResumenPanel } from "@/components/listings/ListingResumenPanel";
import { NeighborhoodGauge } from "@/components/listings/NeighborhoodGauge";
import { NotariadoPortalPanel } from "@/components/notariado/NotariadoPortalPanel";
import { PriceValuationSlider } from "@/components/listings/PriceValuationSlider";
import { SaveListingButton } from "@/components/listings/SaveListingButton";
import { decodeListingTitle } from "@/lib/decode-html";
import type { ListingSummary } from "@/lib/listing/summary-types";
import { portalBadge } from "@/lib/portals";
import Link from "next/link";
import { useState } from "react";

export type ListingDetailData = {
  id: string;
  title: string;
  price: number;
  source_url: string;
  source_portal: string;
  city: string;
  postal_code: string;
  sqm: number;
  bedrooms: number;
  bathrooms?: number;
  thumbnail_url?: string | null;
  investment?: {
    rent_est: number;
    roi_gross: number;
    rent_confidence: string;
    comparables_count: number;
  };
  enrichment?: { rc: string | null; catastral_surface: number | null; year_built: number | null };
  scraped_at?: string | null;
};

type Tab = "resumen" | "inversion" | "mercado" | "catastro";

function proxiedThumb(url: string | null | undefined) {
  if (!url) return null;
  if (url.includes("pisos.com") || url.includes("kelify.com")) {
    return `/api/image-proxy?u=${encodeURIComponent(url)}`;
  }
  return url;
}

export function ListingDetailFullView({
  listing,
  summary,
  summaryLoading,
  backHref,
  backLabel,
  onEnrichCatastro,
  enriching,
  enrichError,
}: {
  listing: ListingDetailData;
  summary: ListingSummary | null;
  summaryLoading?: boolean;
  backHref: string;
  backLabel: string;
  onEnrichCatastro: () => void;
  enriching: boolean;
  enrichError: string | null;
}) {
  const [tab, setTab] = useState<Tab>("resumen");
  const portal = portalBadge(listing.source_portal);
  const imgSrc = proxiedThumb(listing.thumbnail_url);
  const price = Number(listing.price);
  const roi = summary?.roi.grossRoiPct ?? listing.investment?.roi_gross ?? null;
  const listingM2 = summary?.pricePerSqm ?? (listing.sqm > 0 ? price / listing.sqm : null);

  const specs = [
    listing.bedrooms != null ? `${listing.bedrooms} dorm.` : null,
    listing.bathrooms != null ? `${listing.bathrooms} baños` : null,
    listing.sqm != null ? `${listing.sqm} m²` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const calcHref = `/app/calculator?price=${Math.round(price)}&rent=${Math.round(summary?.roi.rentEstMonthly ?? listing.investment?.rent_est ?? 0)}`;

  const tabs: { id: Tab; label: string }[] = [
    { id: "resumen", label: "Resumen" },
    { id: "inversion", label: "Inversión" },
    { id: "mercado", label: "Mercado" },
    { id: "catastro", label: "Catastro" },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-neutral-100 lg:flex-row">
      <div className="relative flex min-h-[38vh] shrink-0 flex-col lg:min-h-0 lg:w-[min(44vw,560px)] lg:border-r lg:border-neutral-200">
        <div className="absolute inset-0 bg-neutral-900">
          {imgSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imgSrc} alt="" className="h-full w-full object-cover opacity-95" />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-950 text-neutral-500">
              Sin imagen
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
        </div>

        <div className="relative z-10 flex flex-1 flex-col justify-between p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <Link
              href={backHref}
              className="rounded-lg bg-black/40 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur hover:bg-black/55"
            >
              ← {backLabel}
            </Link>
            <SaveListingButton listingId={listing.id} compact />
          </div>

          <div className="mt-auto space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {summary?.opportunity && (
                <>
                  <SellerKindBadge kind={summary.opportunity.sellerKind} />
                  <OpportunityScoreBadge score={summary.opportunity.opportunityScore} />
                </>
              )}
              <span className="rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase text-white backdrop-blur">
                {portal.name}
              </span>
            </div>
            <h1 className="text-2xl font-bold leading-tight text-white sm:text-3xl">
              {decodeListingTitle(listing.title)}
            </h1>
            <p className="text-sm text-neutral-200">
              {listing.city} · CP {listing.postal_code}
              {specs ? ` · ${specs}` : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#f4f3f0]">
        <div className="shrink-0 border-b border-neutral-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <ValuationSnippet
                price={price}
                valuationMid={summary?.opportunity.valuationMid ?? null}
                discountPct={summary?.opportunity.discountPct ?? null}
              />
              {!summary?.opportunity?.valuationMid && (
                <p className="text-3xl font-bold tabular-nums tracking-tight text-neutral-950">
                  {price.toLocaleString("es-ES")} €
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {roi != null && (
                <div className="rounded-xl bg-neutral-950 px-4 py-2 text-center">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400">ROI bruto</p>
                  <p className="text-xl font-bold tabular-nums text-emerald-400">{roi.toFixed(2)} %</p>
                </div>
              )}
              {listingM2 != null && (
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-center">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-neutral-500">Anuncio</p>
                  <p className="text-lg font-bold tabular-nums text-neutral-950">
                    {Math.round(listingM2).toLocaleString("es-ES")} €/m²
                  </p>
                </div>
              )}
              <a
                href={listing.source_url}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-700"
              >
                Ver en {portal.name}
              </a>
            </div>
          </div>
          {summary?.opportunity && (
            <div className="mt-4">
              <PriceValuationSlider price={price} metrics={summary.opportunity} />
            </div>
          )}
        </div>

        <div className="shrink-0 border-b border-neutral-200 bg-white px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex gap-1 overflow-x-auto py-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  tab === t.id
                    ? "bg-neutral-950 text-white"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          {summary && (
            <div className="mb-6">
              <InteractiveMarketChart summary={summary} listingPriceM2={listingM2} />
            </div>
          )}
          {summaryLoading && !summary && (
            <p className="mb-6 rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
              Cargando métricas de mercado…
            </p>
          )}

          {tab === "resumen" && (
            <div className="space-y-6">
              <ListingAiAnalysisBlock listingId={listing.id} autoLoadCache />
              {summary && (
                <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
                  <ListingResumenPanel summary={summary} listingId={listing.id} embedded showAi={false} />
                </div>
              )}
            </div>
          )}

          {tab === "inversion" && (
            <div className="space-y-4">
              {summary ? (
                <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
                  <ListingResumenPanel summary={summary} listingId={listing.id} embedded showAi={false} />
                </div>
              ) : listing.investment ? (
                <dl className="grid gap-3 rounded-xl border border-neutral-200 bg-white p-6 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-neutral-500">Renta est.</dt>
                    <dd className="text-lg font-bold tabular-nums">{listing.investment.rent_est} €/mes</dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">ROI bruto</dt>
                    <dd className="text-lg font-bold tabular-nums">{listing.investment.roi_gross?.toFixed(2)} %</dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">Confianza</dt>
                    <dd className="font-medium">
                      {listing.investment.rent_confidence} ({listing.investment.comparables_count} comp.)
                    </dd>
                  </div>
                </dl>
              ) : null}
              <Link
                href={calcHref}
                className="inline-flex rounded-xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white"
              >
                Calculadora completa →
              </Link>
            </div>
          )}

          {tab === "mercado" && (
            <div className="space-y-6">
              {summary?.neighborhood.listingPriceM2 != null && summary.neighborhood.cpAvgPriceM2 != null && (
                <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-neutral-950">Posición vs media del CP</h3>
                  <div className="mt-4">
                    <NeighborhoodGauge
                      listingM2={summary.neighborhood.listingPriceM2}
                      cpAvgM2={summary.neighborhood.cpAvgPriceM2}
                      vsPct={summary.neighborhood.vsCpPct}
                    />
                  </div>
                </section>
              )}
              {summary?.notary?.portal ? (
                <NotariadoPortalPanel portal={summary.notary.portal} />
              ) : summary?.notary ? (
                <dl className="grid gap-4 rounded-xl border border-neutral-200 bg-white p-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-neutral-500">Precio medio / m²</dt>
                    <dd className="text-lg font-bold tabular-nums">
                      {summary.notary.priceM2?.toLocaleString("es-ES") ?? "—"} €
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-neutral-500">Compraventas (periodo)</dt>
                    <dd className="text-lg font-bold tabular-nums">{summary.notary.operationsCount ?? "—"}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-neutral-600">Sin datos notariales para este CP.</p>
              )}
            </div>
          )}

          {tab === "catastro" && (
            <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-neutral-950">Catastro</h3>
              {listing.enrichment?.rc ? (
                <dl className="mt-3 space-y-2 text-sm text-neutral-800">
                  <div>
                    <dt className="text-neutral-500">Referencia catastral</dt>
                    <dd className="font-mono font-medium">{listing.enrichment.rc}</dd>
                  </div>
                  {listing.enrichment.catastral_surface != null && (
                    <div>
                      <dt className="text-neutral-500">Superficie catastral</dt>
                      <dd>{listing.enrichment.catastral_surface} m²</dd>
                    </div>
                  )}
                  {listing.enrichment.year_built != null && (
                    <div>
                      <dt className="text-neutral-500">Año construcción</dt>
                      <dd>{listing.enrichment.year_built}</dd>
                    </div>
                  )}
                </dl>
              ) : (
                <>
                  <p className="mt-2 text-sm text-neutral-600">Datos catastrales pendientes.</p>
                  {enrichError && (
                    <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                      {enrichError}
                    </p>
                  )}
                  <button
                    type="button"
                    disabled={enriching}
                    onClick={onEnrichCatastro}
                    className="mt-4 rounded-lg border border-neutral-300 bg-neutral-50 px-4 py-2 text-sm font-medium disabled:opacity-50"
                  >
                    {enriching ? "Consultando OVC…" : "Enriquecer (Catastro OVC)"}
                  </button>
                </>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
