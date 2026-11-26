"use client";

import { formatScrapedAgeEs } from "@/lib/listing/opportunity-metrics";
import type { OpportunityMetrics } from "@/lib/listing/opportunity-metrics";
import { SELLER_KIND_LABEL } from "@/lib/listing/seller-kind";

export function OpportunityVerifiedBadge() {
  return (
    <span className="rounded-md bg-orange-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
      Oportunidad
    </span>
  );
}

export function DiscountPctBadge({ pct }: { pct: number | null | undefined }) {
  if (pct == null || pct < 5) return null;
  return (
    <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-bold tabular-nums text-white">
      −{Math.round(pct)} %
    </span>
  );
}

export function OpportunityScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return null;
  const tone =
    score >= 75 ? "bg-emerald-700 text-white" : score >= 50 ? "bg-amber-600 text-white" : "bg-neutral-600 text-white";
  return (
    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold tabular-nums ${tone}`}>
      {score}/100
    </span>
  );
}

export function SellerKindBadge({ kind }: { kind: OpportunityMetrics["sellerKind"] }) {
  if (kind === "unknown") return null;
  const styles: Record<string, string> = {
    bank: "border-sky-300 bg-sky-50 text-sky-950",
    agency: "border-violet-300 bg-violet-50 text-violet-950",
    private: "border-neutral-300 bg-neutral-50 text-neutral-800",
    auction: "border-orange-300 bg-orange-50 text-orange-950",
  };
  return (
    <span
      className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles[kind] ?? styles.agency}`}
    >
      {SELLER_KIND_LABEL[kind]}
    </span>
  );
}

export function ValuationSnippet({
  price,
  valuationMid,
  valuationLow,
  valuationHigh,
  discountPct,
}: {
  price: number;
  valuationMid: number | null;
  valuationLow?: number | null;
  valuationHigh?: number | null;
  discountPct: number | null;
}) {
  if (valuationMid == null) return null;
  const range =
    valuationLow != null && valuationHigh != null
      ? `${Math.round(valuationLow).toLocaleString("es-ES")}–${Math.round(valuationHigh).toLocaleString("es-ES")} €`
      : null;
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
      <span className="font-bold tabular-nums text-neutral-950">{price.toLocaleString("es-ES")} €</span>
      <span className="text-neutral-500">·</span>
      <span className="tabular-nums text-emerald-800">
        ≈ {valuationMid.toLocaleString("es-ES")} € valoración
      </span>
      {discountPct != null && discountPct > 3 && (
        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-900">
          −{discountPct.toFixed(0)} % bajo valor
        </span>
      )}
      {discountPct != null && discountPct < -3 && (
        <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-900">
          +{Math.abs(discountPct).toFixed(0)} % sobre valor
        </span>
      )}
      {range && <span className="w-full text-[10px] text-neutral-500">Horquilla habitual: {range}</span>}
    </div>
  );
}

/**
 * Marquesina de valoración: "Pagas X € por un piso valorado en Y €".
 * Requiere 2 líneas y transmite el descuento en una sola frase.
 */
export function PriceVsValuationHeadline({
  price,
  valuationMid,
  valuationLow,
  valuationHigh,
  discountPct,
  propertyLabel = "esta vivienda",
}: {
  price: number;
  valuationMid: number | null;
  valuationLow?: number | null;
  valuationHigh?: number | null;
  discountPct: number | null;
  propertyLabel?: string;
}) {
  const fmt = (n: number) => Math.round(n).toLocaleString("es-ES");
  if (valuationMid == null) {
    return (
      <p className="text-3xl font-bold tabular-nums tracking-tight text-neutral-950">
        {fmt(price)} €
      </p>
    );
  }
  const under = discountPct != null && discountPct > 0;
  return (
    <div className="space-y-1">
      <p className="text-2xl font-bold leading-snug tracking-tight text-neutral-950 sm:text-3xl">
        Pagas{" "}
        <span className="tabular-nums text-neutral-950">{fmt(price)} €</span> por {propertyLabel} valorada en{" "}
        <span className="tabular-nums text-emerald-700">{fmt(valuationMid)} €</span>
        {under && discountPct != null && (
          <span className="ml-1 rounded-md bg-emerald-600 px-2 py-0.5 align-middle text-sm font-bold tabular-nums text-white">
            −{Math.round(discountPct)} %
          </span>
        )}
      </p>
      <p className="text-xs text-neutral-600">
        {valuationLow != null && valuationHigh != null
          ? `Horquilla razonable ${fmt(valuationLow)}–${fmt(valuationHigh)} € · `
          : ""}
        calculada con ventas notariales de la zona y comparables de mercado.
      </p>
    </div>
  );
}

export function ScrapedAgeLabel({ metrics }: { metrics: OpportunityMetrics | null | undefined }) {
  const label = formatScrapedAgeEs(metrics?.scrapedAgeDays ?? null);
  if (!label) return null;
  return <span className="text-[10px] text-neutral-500">{label}</span>;
}
