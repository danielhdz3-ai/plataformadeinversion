import { haversineKm } from "./geo.mjs";
import { listCities } from "./spain-city.mjs";

const FOTOCASA_CITY_SLUG = {
  barcelona: "barcelona-capital",
  madrid: "madrid-capital",
  valencia: "valencia-capital",
  sevilla: "sevilla-capital",
  malaga: "malaga-capital",
  bilbao: "bilbao",
  zaragoza: "zaragoza-capital",
  murcia: "murcia-capital",
  alicante: "alicante-alacant",
  "a-coruna": "a-coruna",
  palma: "palma-de-mallorca",
  "las-palmas": "las-palmas-de-gran-canaria",
  "santa-cruz-tenerife": "santa-cruz-de-tenerife",
  girona: "girona",
  granada: "granada-capital",
  cadiz: "cadiz",
  cordoba: "cordoba",
  valladolid: "valladolid",
  pamplona: "pamplona",
  santander: "santander",
  oviedo: "oviedo",
  toledo: "toledo",
  salamanca: "salamanca",
  burgos: "burgos",
  almeria: "almeria-capital",
};

function cityCenter(city) {
  const lng = city.bbox?.[0] != null ? (city.bbox[0] + city.bbox[2]) / 2 : null;
  const lat = city.bbox?.[1] != null ? (city.bbox[1] + city.bbox[3]) / 2 : null;
  if (lng != null && lat != null) return { lat, lng };
  return null;
}

/** Ciudad pisos/Fotocasa más cercana al punto (cualquier capital provincia Tier 1+2). */
export function resolveNearestCity(lat, lng, maxKm = 95) {
  let best = null;
  for (const c of listCities()) {
    const center = cityCenter(c);
    if (!center) continue;
    const d = haversineKm(lat, lng, center.lat, center.lng);
    if (d > maxKm) continue;
    if (!best || d < best.distKm) {
      best = { city: c, distKm: d, lat: center.lat, lng: center.lng };
    }
  }
  if (!best) {
    for (const c of listCities()) {
      const center = cityCenter(c);
      if (!center) continue;
      const d = haversineKm(lat, lng, center.lat, center.lng);
      if (!best || d < best.distKm) best = { city: c, distKm: d, lat: center.lat, lng: center.lng };
    }
  }
  if (!best) return null;
  const c = best.city;
  const fotocasaSlug = FOTOCASA_CITY_SLUG[c.slug] ?? c.slug;
  return {
    slug: fotocasaSlug,
    name: c.name,
    ccaa: c.ccaa,
    citySlug: c.slug,
    pisosCitySlug: c.pisosSlug,
    pisosSkip: Boolean(c.pisosSkip),
    pisosDistrict: null,
    kind: "city",
    lat: best.lat,
    lng: best.lng,
    distKm: best.distKm,
  };
}
