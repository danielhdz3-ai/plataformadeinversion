"use client";

import type { OpportunityMetrics } from "@/lib/listing/opportunity-metrics";

export function PriceValuationSlider({
  price,
  metrics,
}: {
  price: number;
  metrics: OpportunityMetrics | null | undefined;
}) {
  const low = metrics?.valuationLow;
  const high = metrics?.valuationHigh;
  const mid = metrics?.valuationMid;
  if (low == null || high == null || mid == null || high <= low) return null;

  const span = high - low;
  const pricePct = clampPct(((price - low) / span) * 100);
  const midPct = clampPct(((mid - low) / span) * 100);

  const conf = metrics?.valuationConfidence ?? "low";
  const confLabel =
    conf === "high"
      ? "Confianza media"
      : conf === "medium"
        ? "Confianza media-baja"
        : "Confianza baja · orientativa";

  return (
    <div className="space-y-2 rounded-lg border border-neutral-200 bg-[#faf9f7] p-3">
      <div className="flex justify-between text-[10px] text-neutral-500 tabular-nums">
        <span>{Math.round(low).toLocaleString("es-ES")}</span>
        <span>{Math.round(high).toLocaleString("es-ES")}</span>
      </div>
      <div className="relative h-2 rounded-full bg-neutral-200">
        <div
          className="absolute inset-y-0 rounded-full bg-amber-200/80"
          style={{ left: `${Math.min(pricePct, midPct)}%`, width: `${Math.abs(pricePct - midPct)}%` }}
        />
        <div
          className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-neutral-950"
          style={{ left: `${midPct}%` }}
          title="Valoración orientativa"
        />
        <div
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-red-600 shadow"
          style={{ left: `${pricePct}%` }}
          title="Precio anuncio"
        />
      </div>
      <div className="flex flex-wrap justify-between gap-2 text-[10px] text-neutral-600">
        <span>Piden · valoración ≈ {mid.toLocaleString("es-ES")} €</span>
        <span>{confLabel}</span>
      </div>
    </div>
  );
}

function clampPct(n: number) {
  return Math.min(100, Math.max(0, n));
}
