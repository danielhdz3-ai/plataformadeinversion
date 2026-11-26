"use client";

import type { ListingSummary } from "@/lib/listing/summary-types";
import { dealNumbersFromSummary, fmtEur } from "@/lib/listing/deal-numbers";

/**
 * "Los números": coste real de la operación (no solo el precio del anuncio).
 * Fórmula compartida con las tarjetas del feed — ver `deal-numbers.ts`.
 */
export function DealNumbersBlock({ summary, price }: { summary: ListingSummary; price: number }) {
  const deal = dealNumbersFromSummary(summary, price);
  const itp = deal.taxPct;
  const closingCosts = deal.closingCosts;
  const totalCost = deal.totalCost;
  const roiNet = deal.netYieldPct;
  const cash = deal.cashInvested;
  const rent = deal.rentMonthly;

  const rows = [
    { label: "Precio del anuncio", value: fmtEur(price), sub: null },
    {
      label: `ITP (${itp.toFixed(1)} % sobre precio)`,
      value: fmtEur(deal.taxAmount),
      sub: "Calculado sobre el precio; Hacienda puede liquidar sobre el valor de referencia de Catastro si es mayor.",
    },
    {
      label: "Gastos de cierre (notaría, registro, gestoría)",
      value: fmtEur(closingCosts),
      sub: "Estimación habitual del 1 % + 300 €.",
    },
    { label: "Coste total si no hay reforma", value: fmtEur(totalCost), sub: null, strong: true },
  ];

  return (
    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-200 px-5 py-4">
        <h2 className="text-base font-bold text-neutral-950">Los números</h2>
        <p className="mt-0.5 text-xs text-neutral-600">
          Lo que cuesta de verdad la operación y lo que puede dar.
        </p>
      </div>
      <dl className="divide-y divide-neutral-100">
        {rows.map((r) => (
          <div key={r.label} className="flex items-start justify-between gap-4 px-5 py-3">
            <div className="min-w-0">
              <dt
                className={`text-sm ${r.strong ? "font-semibold text-neutral-950" : "text-neutral-700"}`}
              >
                {r.label}
              </dt>
              {r.sub && <p className="mt-0.5 text-[11px] leading-snug text-neutral-500">{r.sub}</p>}
            </div>
            <dd
              className={`shrink-0 tabular-nums ${
                r.strong ? "text-base font-bold text-neutral-950" : "text-sm font-semibold text-neutral-900"
              }`}
            >
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="grid grid-cols-2 gap-px border-t border-neutral-200 bg-neutral-100">
        <div className="bg-white px-5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
            Inversión total con impuestos
          </p>
          <p className="text-lg font-bold tabular-nums text-neutral-950">{fmtEur(totalCost)}</p>
          {cash > 0 && Math.abs(cash - totalCost) > 1 && (
            <p className="text-[10px] text-neutral-500">Con reforma prevista: {fmtEur(cash)}</p>
          )}
        </div>
        <div className="bg-white px-5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
            Rentabilidad neta estimada
          </p>
          <p className="text-lg font-bold tabular-nums text-emerald-700">
            {roiNet != null ? `${roiNet.toFixed(2)} %` : "—"}
          </p>
          <p className="text-[10px] text-neutral-500">
            {rent != null
              ? `Renta ${fmtEur(rent)}/mes menos 18 % de gastos`
              : "Sin renta estimada fiable"}
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * "Antes de comprar": a favor, a vigilar y qué comprobar.
 * Derivado de datos reales del listing — no texto genérico.
 */
export function BeforeBuyingBlock({ summary, price }: { summary: ListingSummary; price: number }) {
  const pros: string[] = [];
  const watch: string[] = [];
  const check: string[] = [];

  const o = summary.opportunity;
  if (o.discountPct != null && o.discountPct >= 8) {
    pros.push(
      `Se vende un ${Math.round(o.discountPct)} % por debajo de su valoración orientativa (${fmtEur(o.valuationMid)}).`
    );
  }
  if (o.sellerKind === "bank") pros.push("Vendedor banco o servicer: margen de negociación habitual.");
  if (summary.roi.rentConfidence === "high") {
    pros.push(`Renta respaldada por ${summary.roi.comparablesCount} alquileres reales en la zona.`);
  }
  if (summary.neighborhood.vsCpPct != null && summary.neighborhood.vsCpPct < -5) {
    pros.push(
      `El €/m² de este anuncio está ${Math.abs(Math.round(summary.neighborhood.vsCpPct))} % por debajo de la media del código postal.`
    );
  }
  if (pros.length === 0) pros.push("Dentro de los rangos habituales de mercado de su zona.");

  if (o.discountPct != null && o.discountPct > 30) {
    watch.push(
      "Descuento muy elevado: comprueba estado real, ocupación y cargas antes de pujar. Puede incluir obra pendiente."
    );
  }
  if (o.scrapedAgeDays != null && o.scrapedAgeDays > 45) {
    watch.push(`El anuncio lleva ${o.scrapedAgeDays} días publicado: verifica que sigue disponible.`);
  }
  if (summary.roi.rentConfidence !== "high") {
    watch.push(
      "La renta es una estimación con pocos comparables: valida precios de alquiler reales del mismo edificio o calle."
    );
  }
  if (summary.listingId && summary.demographics && "note" in summary.demographics) {
    watch.push("Sin datos censales INE de la sección: usa el mercado notarial del CP como referencia.");
  }

  check.push("Nota simple del Registro de la Propiedad: titularidad, cargas y anotaciones.");
  check.push("Estado real del inmueble: visita o pide fotos y vídeo recientes.");
  check.push("Certificado energético, ITE del edificio y cédula de habitabilidad donde se exija.");
  check.push("Comunidad de propietarios al día y recibo de IBI del último año.");
  check.push(`Presupuesto de reforma: sobre ${fmtEur(price)}, una obra media puede ir del 8 % al 20 %.`);

  const Col = ({
    title,
    items,
    tone,
  }: {
    title: string;
    items: string[];
    tone: "ok" | "warn" | "neutral";
  }) => {
    const dot = tone === "ok" ? "bg-emerald-500" : tone === "warn" ? "bg-amber-500" : "bg-neutral-400";
    return (
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">{title}</h3>
        <ul className="mt-2 space-y-2">
          {items.map((t) => (
            <li key={t} className="flex gap-2 text-xs leading-snug text-neutral-700">
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-200 px-5 py-4">
        <h2 className="text-base font-bold text-neutral-950">Antes de comprar</h2>
        <p className="mt-0.5 text-xs text-neutral-600">Lo bueno, lo que vigilar y qué comprobar.</p>
      </div>
      <div className="grid gap-5 px-5 py-4 sm:grid-cols-2">
        <Col title="A favor" items={pros} tone="ok" />
        <Col title={watch.length ? "A vigilar" : "Qué comprobar"} items={watch.length ? watch : check.slice(0, 3)} tone="warn" />
      </div>
      <div className="border-t border-neutral-100 px-5 py-4">
        <Col title="Qué comprobar" items={check} tone="neutral" />
      </div>
    </section>
  );
}
