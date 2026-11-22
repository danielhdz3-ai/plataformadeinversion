"use client";

import type { ListingSummary } from "@/lib/listing/summary-types";
import type { NotaryPortalStats } from "@/lib/notariado/types";
import { useCallback, useMemo, useRef, useState } from "react";

type Point = { x: string; y: number };
type SeriesKey = "sale" | "rent" | "ops";

function fmtEuro(n: number, decimals = 0) {
  return n.toLocaleString("es-ES", { maximumFractionDigits: decimals });
}

function buildOpsSeries(portal: NotaryPortalStats | null | undefined): Point[] {
  if (!portal?.monthly?.labels?.length || !portal.monthly.salesCount?.length) return [];
  const n = Math.min(portal.monthly.labels.length, portal.monthly.salesCount.length);
  return Array.from({ length: n }, (_, i) => ({
    x: portal.monthly.labels[i]!,
    y: Number(portal.monthly.salesCount[i]),
  }));
}

export function InteractiveMarketChart({
  summary,
  listingPriceM2,
}: {
  summary: ListingSummary;
  listingPriceM2?: number | null;
}) {
  const { priceEvolution, notary } = summary;
  const opsPoints = useMemo(() => {
    const opsRaw = buildOpsSeries(notary?.portal);
    if (opsRaw.length < 2) return [] as Point[];
    return opsRaw.map((p) => ({
      x: p.x.replace(/^(\d{4})-(\d{2})$/, (_, y, m) => {
        const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
        return `${months[Number(m) - 1] ?? m} ${String(y).slice(2)}`;
      }),
      y: p.y,
    }));
  }, [notary?.portal]);

  const [series, setSeries] = useState<SeriesKey>("sale");
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const activePoints = useMemo(() => {
    if (series === "rent") return priceEvolution.rentM2;
    if (series === "ops") return opsPoints;
    return priceEvolution.saleM2;
  }, [series, priceEvolution, opsPoints]);

  const unit =
    series === "ops" ? " compraventas" : series === "rent" ? " €/m²/mes" : " €/m²";

  const w = 900;
  const h = 280;
  const pad = { l: 56, r: 24, t: 28, b: 44 };

  const { coords, pathArea, pathLine, listingY } = useMemo(() => {
    const pts = activePoints;
    if (pts.length < 2) {
      return {
        coords: [] as { x: number; y: number; px: Point }[],
        pathArea: "",
        pathLine: "",
        listingY: null as number | null,
      };
    }
    const ys = pts.map((p) => p.y);
    let min = Math.min(...ys);
    let max = Math.max(...ys);
    if (listingPriceM2 != null && series === "sale") {
      min = Math.min(min, listingPriceM2);
      max = Math.max(max, listingPriceM2);
    }
    const yPad = (max - min) * 0.08 || 1;
    min -= yPad;
    max += yPad;
    const innerW = w - pad.l - pad.r;
    const innerH = h - pad.t - pad.b;
    const toY = (val: number) => pad.t + innerH - ((val - min) / (max - min)) * innerH;
    const coords = pts.map((px, i) => {
      const x = pad.l + (i / (pts.length - 1)) * innerW;
      const y = toY(px.y);
      return { x, y, px };
    });
    const line = coords.map((c) => `${c.x},${c.y}`).join(" ");
    const area = `${pad.l},${pad.t + innerH} ${line} ${pad.l + innerW},${pad.t + innerH}`;
    const listingY =
      listingPriceM2 != null && series === "sale" ? toY(listingPriceM2) : null;
    return { coords, pathArea: area, pathLine: line, listingY };
  }, [activePoints, listingPriceM2, series]);

  const onMove = useCallback(
    (clientX: number) => {
      const svg = svgRef.current;
      if (!svg || coords.length < 2) return;
      const rect = svg.getBoundingClientRect();
      const rel = ((clientX - rect.left) / rect.width) * w;
      let best = 0;
      let bestD = Infinity;
      coords.forEach((c, i) => {
        const d = Math.abs(c.x - rel);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      setHover(best);
    },
    [coords]
  );

  const changePct =
    series === "rent"
      ? priceEvolution.rentChangePct
      : series === "sale"
        ? priceEvolution.saleChangePct
        : null;

  const last = activePoints.at(-1);
  const hoverPoint = hover != null ? coords[hover] : null;

  const tabs: { id: SeriesKey; label: string; disabled?: boolean }[] = [
    { id: "sale", label: "Venta €/m²" },
    {
      id: "rent",
      label: "Alquiler €/m²",
      disabled: priceEvolution.rentM2.length < 2,
    },
    { id: "ops", label: "Compraventas / mes", disabled: opsPoints.length < 2 },
  ];

  return (
    <section className="overflow-hidden rounded-xl border border-neutral-800/80 bg-neutral-950 text-white shadow-xl">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-800 px-5 py-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
            Evolución de mercado
          </p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight">
            {series === "ops" ? "Actividad notarial" : "Precio por metro cuadrado"}
          </h3>
          <p className="mt-1 max-w-xl text-xs text-neutral-400">
            {priceEvolution.sourceLabel ??
              "Serie basada en estadísticas del CP (notariado / estimación)."}
          </p>
        </div>
        <div className="text-right">
          {last && (
            <p className="text-2xl font-bold tabular-nums tracking-tight">
              {fmtEuro(last.y, series === "rent" ? 1 : 0)}
              <span className="text-sm font-medium text-neutral-500">{unit}</span>
            </p>
          )}
          {changePct != null && series !== "ops" && (
            <p
              className={`text-sm font-semibold tabular-nums ${
                changePct >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {changePct >= 0 ? "+" : ""}
              {changePct.toFixed(1)} % en el periodo
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 px-5 pt-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={t.disabled}
            onClick={() => {
              setSeries(t.id);
              setHover(null);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              series === t.id
                ? "bg-white text-neutral-950"
                : "text-neutral-400 hover:bg-neutral-800 hover:text-white disabled:opacity-30"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {coords.length < 2 ? (
        <p className="px-5 py-12 text-sm text-neutral-500">
          Sin histórico suficiente. Importa datos del Portal del Notariado para este CP.
        </p>
      ) : (
        <div
          className="relative px-2 pb-4 pt-2"
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => onMove(e.clientX)}
          role="img"
          aria-label="Gráfico interactivo de evolución de precios"
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${w} ${h}`}
            className="h-[min(42vh,320px)] w-full touch-none select-none"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="marketFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(52,211,153,0.35)" />
                <stop offset="100%" stopColor="rgba(52,211,153,0)" />
              </linearGradient>
            </defs>
            {[0, 0.25, 0.5, 0.75, 1].map((t) => {
              const y = pad.t + (h - pad.t - pad.b) * t;
              return (
                <line
                  key={t}
                  x1={pad.l}
                  x2={w - pad.r}
                  y1={y}
                  y2={y}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="1"
                />
              );
            })}
            <polygon points={pathArea} fill="url(#marketFill)" />
            <polyline
              fill="none"
              stroke="#34d399"
              strokeWidth="2.5"
              strokeLinejoin="round"
              points={pathLine}
            />
            {listingY != null && (
              <line
                x1={pad.l}
                x2={w - pad.r}
                y1={listingY}
                y2={listingY}
                stroke="rgba(251,191,36,0.9)"
                strokeDasharray="6 4"
                strokeWidth="1.5"
              />
            )}
            {coords.map((c, i) => (
              <circle
                key={i}
                cx={c.x}
                cy={c.y}
                r={hover === i ? 6 : 3}
                fill={hover === i ? "#fff" : "#34d399"}
                className="transition-all"
              />
            ))}
            {hoverPoint && (
              <>
                <line
                  x1={hoverPoint.x}
                  x2={hoverPoint.x}
                  y1={pad.t}
                  y2={h - pad.b}
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth="1"
                />
              </>
            )}
          </svg>
          {hoverPoint && (
            <div
              className="pointer-events-none absolute top-4 rounded-lg border border-neutral-700 bg-neutral-900/95 px-3 py-2 text-xs shadow-lg backdrop-blur"
              style={{
                left: `clamp(12px, ${(hoverPoint.x / w) * 100}%, calc(100% - 140px))`,
              }}
            >
              <p className="font-medium text-neutral-300">{hoverPoint.px.x}</p>
              <p className="text-base font-bold tabular-nums text-white">
                {fmtEuro(hoverPoint.px.y, series === "rent" ? 1 : 0)}
                {unit}
              </p>
            </div>
          )}
          <div className="flex justify-between px-4 text-[10px] text-neutral-500">
            <span>{activePoints[0]?.x}</span>
            <span>{activePoints.at(-1)?.x}</span>
          </div>
          {listingPriceM2 != null && series === "sale" && (
            <p className="px-4 pt-1 text-[10px] text-amber-400/90">
              Línea ámbar: €/m² de este anuncio ({fmtEuro(listingPriceM2)} €/m²)
            </p>
          )}
        </div>
      )}
    </section>
  );
}
