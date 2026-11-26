"use client";

import { decodeListingTitle } from "@/lib/decode-html";
import type { ListingSummary } from "@/lib/listing/summary-types";
import { computeOpportunityMetrics } from "@/lib/listing/opportunity-metrics";
import { resolveListingSqm } from "@/lib/listing/resolve-sqm";
import { portalBadge } from "@/lib/portals";
import { SELLER_KIND_LABEL } from "@/lib/listing/seller-kind";
import { listingDetailHref } from "@/lib/listing/return-navigation";
import { listingOrigin, LISTING_ORIGIN_LABEL, LISTING_ORIGIN_CLASS } from "@/lib/listing/listing-origin";
import { valuationDiscountCopy } from "@/lib/listing/valuation-copy";
import { SaveListingButton } from "@/components/listings/SaveListingButton";
import { grossRoiForDisplay } from "@/lib/listing/display-roi";
import { formatScrapedAgeEs } from "@/lib/listing/opportunity-metrics";
import Link from "next/link";
import { useEffect, useState } from "react";

function proxiedThumb(url: string | null | undefined) {
  if (!url) return null;
  if (url.includes("pisos.com") || url.includes("kelify.com")) {
    return `/api/image-proxy?u=${encodeURIComponent(url)}`;
  }
  return url;
}

export type RadarOpportunityCardProps = {
  listingId: string;
  title: string;
  city?: string | null;
  postalCode?: string | null;
  price: number;
  sourcePortal?: string | null;
  thumbnailUrl?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  sqm?: number | null;
  roi?: number | null;
  rentEst?: number | null;
  sourceUrl?: string | null;
  scrapedAt?: string | null;
  summary?: ListingSummary | null;
  selected?: boolean;
  onSelect?: () => void;
  returnTo?: string | null;
};

export function RadarOpportunityCard({
  listingId,
  title,
  city,
  price,
  sourcePortal,
  thumbnailUrl,
  bedrooms,
  bathrooms,
  sqm,
  roi,
  sourceUrl,
  scrapedAt,
  summary,
  selected,
  onSelect,
  returnTo,
}: RadarOpportunityCardProps) {
  const fichaHref = listingDetailHref(listingId, returnTo);
  const portal = portalBadge(sourcePortal);
  const cleanTitle = decodeListingTitle(title);
  const imgSrc = proxiedThumb(thumbnailUrl);
  const [thumbFailed, setThumbFailed] = useState(false);
  useEffect(() => setThumbFailed(false), [thumbnailUrl]);
  const showThumb = Boolean(imgSrc) && !thumbFailed;

  const effectiveSqm = resolveListingSqm(sqm, title);
  const displayRoi = grossRoiForDisplay(
    summary?.roi.grossRoiPct ?? roi ?? null,
    summary?.roi.rentConfidence ?? null,
    summary?.roi.comparablesCount ?? 0
  );
  const opportunity =
    summary?.opportunity ??
    computeOpportunityMetrics(
      {
        price,
        sqm: effectiveSqm,
        roi: displayRoi,
        sourcePortal,
        title: cleanTitle,
        sourceUrl: sourceUrl ?? undefined,
        scrapedAt,
        rentConfidence: summary?.roi.rentConfidence ?? null,
      },
      summary
    );

  const score = opportunity.opportunityScore;
  const isNew = opportunity.scrapedAgeDays != null && opportunity.scrapedAgeDays <= 7;
  const isRecent = !isNew && opportunity.scrapedAgeDays != null && opportunity.scrapedAgeDays <= 21;
  const ageLabel = formatScrapedAgeEs(opportunity.scrapedAgeDays);
  const origin = listingOrigin(scrapedAt);
  const valuationLine = valuationDiscountCopy(
    opportunity.discountPct,
    opportunity.valuationConfidence
  );
  const isAuction = opportunity.sellerKind === "auction";

  const specParts: string[] = [];
  if (effectiveSqm != null) specParts.push(`${effectiveSqm} m²`);
  if (bedrooms != null) specParts.push(`${bedrooms} hab.`);
  if (bathrooms != null) specParts.push(`${bathrooms} baño${bathrooms === 1 ? "" : "s"}`);

  const scoreRing =
    score == null
      ? ""
      : score >= 75
        ? "from-emerald-500 to-emerald-700"
        : score >= 55
          ? "from-amber-400 to-amber-600"
          : "from-neutral-500 to-neutral-700";

  return (
    <article
      onClick={onSelect}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
      className={`group flex flex-col overflow-hidden rounded-2xl border bg-white transition duration-200 ${
        selected
          ? "border-neutral-900 shadow-[0_12px_40px_rgba(0,0,0,0.12)] ring-1 ring-neutral-900/15"
          : "border-neutral-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-[0_16px_48px_rgba(0,0,0,0.08)]"
      } ${onSelect ? "cursor-pointer" : ""}`}
    >
      <div className="relative aspect-[5/4] w-full shrink-0 overflow-hidden bg-neutral-100">
        {showThumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc!}
            alt=""
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
            onError={() => setThumbFailed(true)}
            className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-neutral-100 to-neutral-50 text-neutral-400">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">{portal.name}</span>
            <span className="text-xs text-neutral-400">Imagen no disponible</span>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/35 to-transparent p-3 pb-8">
          <div className="flex flex-wrap gap-1.5">
            {opportunity.sellerKind !== "unknown" && (
              <span className="rounded-md bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-neutral-800 shadow-sm backdrop-blur-sm">
                {SELLER_KIND_LABEL[opportunity.sellerKind]}
              </span>
            )}
            {isNew && (
              <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neutral-900 shadow-sm">
                Nueva
              </span>
            )}
            {isRecent && (
              <span className="rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-medium text-neutral-700 shadow-sm">
                Reciente
              </span>
            )}
          </div>
        </div>

        {score != null && (
          <div
            className={`pointer-events-none absolute -right-0.5 top-3 flex h-[3.25rem] w-[3.25rem] flex-col items-center justify-center rounded-full bg-gradient-to-br ${scoreRing} text-white shadow-lg ring-[3px] ring-white`}
          >
            <span className="text-[15px] font-bold leading-none tabular-nums tracking-tight">{score}</span>
            <span className="text-[8px] font-medium uppercase leading-none opacity-90">score</span>
          </div>
        )}

        <div className="pointer-events-auto absolute bottom-3 left-3 z-10">
          <SaveListingButton listingId={listingId} compact className="!rounded-full !bg-white/95 !shadow-md backdrop-blur-sm" />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-3">
        <Link
          href={fichaHref}
          onClick={(e) => e.stopPropagation()}
          className="line-clamp-2 text-[13px] font-semibold leading-snug text-neutral-950 hover:text-neutral-700"
        >
          {cleanTitle}
        </Link>
        {(city || ageLabel) && (
          <p className="mt-1 flex flex-wrap items-center gap-1.5 truncate text-xs text-neutral-500">
            <span className="truncate">
              {[city ? decodeListingTitle(city) : null, ageLabel ? ageLabel.replace(/^·\s*/, "") : null]
                .filter(Boolean)
                .join(" · ")}
            </span>
            <span
              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${LISTING_ORIGIN_CLASS[origin]}`}
            >
              {LISTING_ORIGIN_LABEL[origin]}
            </span>
          </p>
        )}
        {specParts.length > 0 && (
          <p className="mt-1.5 text-[11px] font-medium text-neutral-600">{specParts.join(" · ")}</p>
        )}

        <div className="mt-3 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Precio</p>
          <p className="text-xl font-bold tabular-nums text-neutral-950">
            {price.toLocaleString("es-ES")} €
          </p>
        </div>

        {opportunity.valuationMid != null && (
          <div className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2">
            <p className="text-[10px] font-medium text-emerald-900/70">Valoración</p>
            <p className="text-sm font-semibold tabular-nums text-emerald-950">
              ≈ {opportunity.valuationMid.toLocaleString("es-ES")} €
            </p>
          </div>
        )}

        {valuationLine && (
          <p className="mt-2 text-[11px] leading-snug text-neutral-600">{valuationLine}</p>
        )}

        {displayRoi != null && (
          <p className="mt-2 text-xs font-semibold text-neutral-800">
            Rentabilidad{" "}
            <span className="tabular-nums text-emerald-700">
              {displayRoi.toLocaleString("es-ES", { maximumFractionDigits: 1 })} %
            </span>
          </p>
        )}

        <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 py-2.5 text-center text-xs font-semibold text-white shadow-sm transition hover:from-orange-600 hover:to-orange-700"
            >
              {isAuction ? "Pujar" : "Contactar"}
            </a>
          ) : (
            <span className="rounded-xl bg-neutral-100 py-2.5 text-center text-xs text-neutral-400">Sin enlace</span>
          )}
          <Link
            href={fichaHref}
            onClick={(e) => e.stopPropagation()}
            className="rounded-xl border border-neutral-300 bg-white py-2.5 text-center text-xs font-semibold text-neutral-800 transition hover:border-neutral-400 hover:bg-neutral-50"
          >
            Analizar
          </Link>
        </div>
      </div>
    </article>
  );
}
