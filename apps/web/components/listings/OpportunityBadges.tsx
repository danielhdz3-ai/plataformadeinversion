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
  discountPct,
}: {
  price: number;
  valuationMid: number | null;
  discountPct: number | null;
}) {
  if (valuationMid == null) return null;
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
    </div>
  );
}

export function ScrapedAgeLabel({ metrics }: { metrics: OpportunityMetrics | null | undefined }) {
  const label = formatScrapedAgeEs(metrics?.scrapedAgeDays ?? null);
  if (!label) return null;
  return <span className="text-[10px] text-neutral-500">{label}</span>;
}
