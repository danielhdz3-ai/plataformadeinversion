"use client";

import { ListingAiAnalysisBlock } from "@/components/listings/ListingAiAnalysisBlock";
import { MetricDetailModal, MetricRowButton } from "@/components/listings/MetricDetailModal";
import { PriceTrendChart } from "@/components/listings/PriceTrendChart";
import { NeighborhoodGauge } from "@/components/listings/NeighborhoodGauge";
import { RoomRentComparablesPanel } from "@/components/listings/RoomRentComparablesPanel";

import { NotariadoPortalPanel } from "@/components/notariado/NotariadoPortalPanel";

import type { ListingSummary } from "@/lib/listing/summary-types";

import Link from "next/link";
import { useState } from "react";

type DetailModal = "roi" | "trend" | "neighborhood" | "notary" | null;

function fmt(n: number, d = 0) {

  return n.toLocaleString("es-ES", { maximumFractionDigits: d });

}



export function ListingResumenPanel({

  summary,

  listingId,

  embedded = false,

  showAi = true,

}: {

  summary: ListingSummary;

  listingId: string;

  /** Tarjeta premium: sin borde superior duplicado */

  embedded?: boolean;

  showAi?: boolean;

}) {

  const { roi, comparables, roomRent, notary, neighborhood, officialMarket, priceEvolution, postalCode } =
    summary;

  const saleLast = priceEvolution.saleM2[priceEvolution.saleM2.length - 1]?.y;

  const rentLast = priceEvolution.rentM2[priceEvolution.rentM2.length - 1]?.y;

  const priceTrendLabel = postalCode
    ? `CP ${postalCode} (indicativo, notariado)`
    : "Mercado local (indicativo)";

  const [detailModal, setDetailModal] = useState<DetailModal>(null);

  return (
    <>
    <div

      className={`space-y-3 bg-[#faf9f7] px-3 py-3 text-xs text-neutral-800 ${

        embedded ? "" : "border-t border-neutral-100"

      }`}

    >

      <div className="flex items-center justify-between">

        <span className="rounded bg-neutral-950 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">

          Resumen inversión

        </span>

        {!embedded && (

          <Link href={`/app/listings/${listingId}`} className="font-medium text-neutral-950 underline">

            Ficha completa

          </Link>

        )}

      </div>



      {showAi && !embedded && (

        <ListingAiAnalysisBlock listingId={listingId} compact />

      )}



      <section className="rounded-lg border border-neutral-200 bg-white p-2.5">

        <h4 className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">

          Estimación de ROI

        </h4>

        <dl className="mt-1.5 space-y-1">

          <MetricRowButton
            label={roomRent ? "Alquiler estimado (habitaciones)" : "Alquiler estimado"}
            value={
              roomRent?.totalEstimateMonthly != null
                ? `${fmt(roomRent.totalEstimateMonthly)} €/mes`
                : roi.rentEstMonthly != null
                  ? `${fmt(roi.rentEstMonthly)} €/mes`
                  : "—"
            }
            onOpen={() => setDetailModal("roi")}
          />

          <MetricRowButton label="Precio de compra" value={`${fmt(roi.purchasePrice)} €`} onOpen={() => setDetailModal("roi")} />

          <MetricRowButton label={`Impuestos compra (${roi.purchaseTaxPct} %)`} value={`${fmt(roi.purchaseTaxAmount)} €`} onOpen={() => setDetailModal("roi")} />

          <MetricRowButton label="Efectivo total invertido" value={`${fmt(roi.totalCashInvested)} €`} strong onOpen={() => setDetailModal("roi")} />

          <MetricRowButton
            label="ROI bruto"
            value={roi.grossRoiPct != null ? `${roi.grossRoiPct.toFixed(2)} %` : "—"}
            strong
            onOpen={() => setDetailModal("roi")}
          />

          {roi.rentConfidence && (

            <p className="text-[10px] text-neutral-500">

              Confianza renta: {roi.rentConfidence} · {roi.comparablesCount} comparables en modelo

            </p>

          )}

        </dl>

        <Link href="/app/calculator" className="mt-2 inline-block text-[10px] font-medium underline">

          Calculadora ROI completa (hipoteca, IBI, cash-on-cash, flip, Airbnb)

        </Link>

      </section>



      <section className="rounded-lg border border-neutral-200 bg-white p-2.5">

        <button
          type="button"
          className="text-left text-[10px] font-semibold uppercase tracking-wide text-neutral-500 underline decoration-dotted"
          onClick={() => setDetailModal("trend")}
        >
          Evolución de precios — {priceTrendLabel}
        </button>

        {priceEvolution.saleM2.length >= 2 || priceEvolution.rentM2.length >= 2 ? (
        <div className="mt-2 grid gap-3 sm:grid-cols-2" role="presentation" onClick={() => setDetailModal("trend")}>

          <div>

            <div className="mb-1 flex items-baseline justify-between gap-1">

              <span className="font-medium text-neutral-800">Venta €/m²</span>

              <span className="tabular-nums text-neutral-950">

                {saleLast != null ? `${Math.round(saleLast).toLocaleString("es-ES")} €` : "—"}

                {priceEvolution.saleM2.length >= 2 && (
                  <span className="ml-1 text-emerald-700">+{priceEvolution.saleChangePct.toFixed(1)}%</span>
                )}

              </span>

            </div>

            <PriceTrendChart points={priceEvolution.saleM2} />

            {priceEvolution.saleM2.length > 0 && (
              <p className="mt-0.5 text-[9px] text-neutral-500">

                {priceEvolution.saleM2.map((p) => p.x).join(" · ")}

              </p>
            )}

          </div>

          <div>

            <div className="mb-1 flex items-baseline justify-between gap-1">

              <span className="font-medium text-neutral-800">Alquiler €/m²/mes</span>

              <span className="tabular-nums text-neutral-950">

                {rentLast != null ? `${rentLast.toFixed(1)} €` : "—"}

                {priceEvolution.rentM2.length >= 2 && (
                  <span className="ml-1 text-emerald-700">+{priceEvolution.rentChangePct.toFixed(1)}%</span>
                )}

              </span>

            </div>

            <PriceTrendChart points={priceEvolution.rentM2} stroke="#525252" fill="rgba(82,82,82,0.12)" />

          </div>

        </div>
        ) : (
          <p className="mt-2 text-neutral-500">
            Sin serie histórica para este CP. Se mostrará al sincronizar datos del notariado.
          </p>
        )}

      </section>



      {neighborhood.listingPriceM2 != null && neighborhood.cpAvgPriceM2 != null && (

        <section className="rounded-lg border border-neutral-200 bg-white p-2.5">

          <button
            type="button"
            className="text-left text-[10px] font-semibold uppercase tracking-wide text-neutral-500 underline decoration-dotted"
            onClick={() => setDetailModal("neighborhood")}
          >
            Resumen del barrio (€/m²)
          </button>

          <div className="mt-2" role="presentation" onClick={() => setDetailModal("neighborhood")}>

            <NeighborhoodGauge
              listingM2={neighborhood.listingPriceM2}
              cpAvgM2={neighborhood.cpAvgPriceM2}
              vsPct={neighborhood.vsCpPct}
            />

          </div>

        </section>

      )}



      {roomRent && (
        <RoomRentComparablesPanel
          comparables={roomRent.comparables}
          estimatePerRoom={roomRent.estimatePerRoom}
          conservativePerRoom={roomRent.conservativePerRoom}
          bedrooms={roomRent.bedrooms}
        />
      )}

      <section className="rounded-lg border border-neutral-200 bg-white p-2.5">

        <h4 className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">

          {roomRent ? "Alquiler piso entero (referencia, 500 m)" : "Comparables de alquiler (500 m)"}

        </h4>

        {comparables.length === 0 ? (

          <p className="mt-1 text-neutral-500">Sin alquileres activos en radio — usa renta estimada del modelo.</p>

        ) : (

          <ul className="mt-1.5 space-y-2">

            {comparables.map((c) => (

              <li key={c.id} className="flex justify-between gap-2 rounded border border-neutral-100 bg-[#faf9f7] p-2">

                <span className="line-clamp-1 flex-1">{c.title ?? "Alquiler"}</span>

                <span className="shrink-0 tabular-nums font-medium">

                  {fmt(c.price)} €/mes · {Math.round(c.distanceM)} m

                </span>

              </li>

            ))}

          </ul>

        )}

      </section>



      {notary?.portal ? (
        <div role="presentation" onClick={() => setDetailModal("notary")}>
          <NotariadoPortalPanel portal={notary.portal} />
        </div>
      ) : (
        notary && (
          <section className="rounded-lg border border-neutral-200 bg-white p-2.5">
            <button
              type="button"
              className="text-left text-[10px] font-semibold uppercase tracking-wide text-neutral-500 underline decoration-dotted"
              onClick={() => setDetailModal("notary")}
            >
              Mercado inmobiliario — CP {summary.postalCode}
            </button>
            <dl className="mt-1.5 grid gap-1 sm:grid-cols-2">
              <Row label="Precio medio / m²" value={notary.priceM2 != null ? `${fmt(notary.priceM2)} €` : "—"} />
              <Row label="Precio medio venta" value={notary.avgPrice != null ? `${fmt(notary.avgPrice)} €` : "—"} />
              <Row label="Superficie media" value={notary.avgSurface != null ? `${fmt(notary.avgSurface)} m²` : "—"} />
              <Row
                label="Compraventas"
                value={notary.operationsCount != null ? String(notary.operationsCount) : "—"}
              />
            </dl>
            {notary.period && (
              <p className="mt-1 text-[10px] text-neutral-500">
                Periodo {notary.period} · Notariado{notary.esEstimado ? " (est.)" : ""}
              </p>
            )}
          </section>
        )
      )}



      {officialMarket.length > 0 && (

        <section className="rounded-lg border border-neutral-200 bg-white p-2.5">

          <h4 className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">

            Índices oficiales (provincia)

          </h4>

          <ul className="mt-1 space-y-1.5 text-[10px] text-neutral-600">

            {officialMarket.map((o) => {

              const m = o.metrics as Record<string, unknown>;

              const idx = m.priceIndexLibre ?? (m.barcelonaLibre as { priceIndex?: number } | undefined)?.priceIndex;

              return (

                <li key={`${o.source}-${o.period}`} className="rounded border border-neutral-100 bg-[#faf9f7] p-2">

                  <span className="font-medium text-neutral-800">{o.source}</span> · {o.period}

                  {idx != null && (

                    <div className="mt-0.5 tabular-nums font-medium text-neutral-950">

                      Índice vivienda libre (MIVAU): {Number(idx).toLocaleString("es-ES")}

                    </div>

                  )}

                </li>

              );

            })}

          </ul>

        </section>

      )}



      <section className="rounded-lg border border-neutral-200 bg-white p-2.5">

        <h4 className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">

          Datos demográficos (INE)

        </h4>

        {"note" in summary.demographics ? (
          <p className="mt-1 text-neutral-600">{summary.demographics.note}</p>
        ) : (
          <>
            <p className="mt-1 text-[10px] text-neutral-500">
              Sección {summary.demographics.cusec}
              {summary.demographics.sectionName ? ` · ${summary.demographics.sectionName}` : ""}
              {summary.demographics.metricsYear ? ` · ${summary.demographics.metricsYear}` : ""}
            </p>
            <dl className="mt-1.5 space-y-1">
              <Row
                label="Población"
                value={
                  summary.demographics.population != null
                    ? fmt(summary.demographics.population)
                    : "—"
                }
              />
              <Row
                label="Renta neta media (€)"
                value={
                  summary.demographics.meanNetIncomeEur != null
                    ? fmt(summary.demographics.meanNetIncomeEur)
                    : "—"
                }
              />
              <Row
                label="Educación superior (%)"
                value={
                  summary.demographics.tertiaryEducationPct != null
                    ? `${fmt(summary.demographics.tertiaryEducationPct, 1)} %`
                    : "—"
                }
              />
              <Row
                label="Paro (%)"
                value={
                  summary.demographics.unemploymentPct != null
                    ? `${fmt(summary.demographics.unemploymentPct, 1)} %`
                    : "—"
                }
              />
            </dl>
            {summary.demographics.sourceUrl && (
              <p className="mt-1 text-[10px] text-neutral-500">
                Fuente:{" "}
                <a
                  href={summary.demographics.sourceUrl}
                  className="underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  INE
                </a>
              </p>
            )}
          </>
        )}

      </section>



      <section className="rounded-lg border border-neutral-200 bg-white p-2.5">

        <h4 className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">

          Desarrollos locales (referencia)

        </h4>

        <ul className="mt-1.5 space-y-2">

          {summary.localDevelopments.map((d) => (

            <li key={d.title} className="rounded border border-neutral-100 bg-[#faf9f7] p-2">

              <p className="font-medium text-neutral-950">{d.title}</p>

              <p className="text-[10px] text-neutral-500">

                {d.category} · {d.year}

              </p>

              <p className="mt-0.5 text-neutral-600">{d.description}</p>

            </li>

          ))}

        </ul>

      </section>



      <section className="rounded-lg border border-neutral-200 bg-white p-2.5">

        <h4 className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">

          Lugares cercanos

        </h4>

        <p className="mt-1 text-neutral-600">{summary.nearbyPlaces.note}</p>

      </section>

    </div>

    <MetricDetailModal
      open={detailModal === "roi"}
      title="Estimación de inversión"
      subtitle="Detalle de cash, impuestos y rentabilidad bruta"
      onClose={() => setDetailModal(null)}
    >
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt>Alquiler est.</dt>
          <dd className="font-semibold tabular-nums">{roi.rentEstMonthly != null ? `${fmt(roi.rentEstMonthly)} €/mes` : "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Precio compra</dt>
          <dd className="font-semibold tabular-nums">{fmt(roi.purchasePrice)} €</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Impuestos ({roi.purchaseTaxPct} %)</dt>
          <dd className="font-semibold tabular-nums">{fmt(roi.purchaseTaxAmount)} €</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-neutral-100 pt-2">
          <dt>Efectivo total</dt>
          <dd className="text-lg font-bold tabular-nums">{fmt(roi.totalCashInvested)} €</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>ROI bruto</dt>
          <dd className="text-lg font-bold tabular-nums text-emerald-800">
            {roi.grossRoiPct != null ? `${roi.grossRoiPct.toFixed(2)} %` : "—"}
          </dd>
        </div>
      </dl>
      <Link href="/app/calculator" className="mt-4 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white">
        Calculadora completa
      </Link>
    </MetricDetailModal>

    <MetricDetailModal
      open={detailModal === "trend"}
      title="Evolución de precios"
      subtitle={priceTrendLabel}
      onClose={() => setDetailModal(null)}
    >
      <div className="space-y-6">
        <div>
          <p className="mb-2 font-medium">Venta €/m²</p>
          <PriceTrendChart points={priceEvolution.saleM2} height={140} />
        </div>
        <div>
          <p className="mb-2 font-medium">Alquiler €/m²/mes</p>
          <PriceTrendChart points={priceEvolution.rentM2} height={140} stroke="#525252" fill="rgba(82,82,82,0.12)" />
        </div>
      </div>
    </MetricDetailModal>

    <MetricDetailModal
      open={detailModal === "neighborhood"}
      title="Posición vs media del CP"
      onClose={() => setDetailModal(null)}
    >
      {neighborhood.listingPriceM2 != null && neighborhood.cpAvgPriceM2 != null && (
        <NeighborhoodGauge
          listingM2={neighborhood.listingPriceM2}
          cpAvgM2={neighborhood.cpAvgPriceM2}
          vsPct={neighborhood.vsCpPct}
        />
      )}
    </MetricDetailModal>

    <MetricDetailModal
      open={detailModal === "notary"}
      title="Mercado notarial"
      subtitle={postalCode ? `CP ${postalCode}` : undefined}
      onClose={() => setDetailModal(null)}
    >
      {notary?.portal ? (
        <NotariadoPortalPanel portal={notary.portal} />
      ) : notary ? (
        <dl className="grid gap-2 sm:grid-cols-2">
          <Row label="Precio medio / m²" value={notary.priceM2 != null ? `${fmt(notary.priceM2)} €` : "—"} />
          <Row label="Precio medio venta" value={notary.avgPrice != null ? `${fmt(notary.avgPrice)} €` : "—"} />
          <Row label="Superficie media" value={notary.avgSurface != null ? `${fmt(notary.avgSurface)} m²` : "—"} />
          <Row label="Compraventas" value={notary.operationsCount != null ? String(notary.operationsCount) : "—"} />
        </dl>
      ) : (
        <p className="text-neutral-500">Sin datos notariales para esta zona.</p>
      )}
    </MetricDetailModal>
    </>
  );

}



function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {

  return (

    <div className="flex justify-between gap-2">

      <dt className="text-neutral-600">{label}</dt>

      <dd className={strong ? "font-bold text-neutral-950" : "font-medium tabular-nums"}>{value}</dd>

    </div>

  );

}

