import { runFotocasaSale } from "./run-fotocasa-scrape.mjs";
import { runPisosSale } from "./run-pisos-scrape.mjs";

/** Refuerzo ciudad completa (pisos + Fotocasa) cuando faltan pins en el polígono. */
export async function ingestCityWide(cityZone, anchor, portals, enabled) {
  if (!cityZone?.citySlug) return { upserted: 0, fotocasa: null, pisos: null };
  let upserted = 0;
  const anchorLng = anchor?.lng ?? cityZone.lng;
  const anchorLat = anchor?.lat ?? cityZone.lat;
  const out = {};

  if (enabled(portals, "fotocasa")) {
    process.env.FOTOCASA_PER_ZONE = process.env.SCAN_CITY_FOTOCASA_PER_ZONE ?? "280";
    process.env.FOTOCASA_MAX_PAGES = process.env.SCAN_CITY_FOTOCASA_PAGES ?? "16");
    out.fotocasa = await runFotocasaSale({
      citySlug: `zone-city-${cityZone.citySlug}`,
      zones: [
        {
          slug: cityZone.slug,
          name: cityZone.name,
          ccaa: cityZone.ccaa,
          lat: anchorLat,
          lng: anchorLng,
        },
      ],
    });
    upserted += out.fotocasa?.inserted ?? 0;
  }

  const pisosSlug = cityZone.pisosCitySlug ?? cityZone.citySlug;
  if (enabled(portals, "pisos_com") && pisosSlug && !cityZone.pisosSkip) {
    out.pisos = await runPisosSale(cityZone.citySlug ?? pisosSlug, {
      maxListings: Number(process.env.SCAN_CITY_PISOS_MAX ?? "550"),
      maxPages: Number(process.env.SCAN_CITY_PISOS_PAGES ?? "32"),
      fallbackLng: anchorLng,
      fallbackLat: anchorLat,
    });
    upserted += out.pisos?.inserted ?? 0;
  }

  return { upserted, ...out };
}
