import type { Province } from "@/types";

/**
 * Subset of Spanish provinces with bounding boxes used to detect which
 * province a given fire point belongs to.
 *
 * Source: approximate centroids from GeoNames / Wikipedia. Bounding boxes
 * were hand-tuned to be generous enough that fires near the borders are
 * still attributed to a province.
 *
 * NOTE: This is intentionally a curated subset (not all 50) so the UI can
 * stay focused on the main fire-prone regions. Add more entries as needed.
 */
export const PROVINCES: Province[] = [
  { slug: "alava", name: "Álava", code: "ES-VI", center: { lat: 42.84, lng: -2.73 }, bbox: [-3.18, 42.56, -2.27, 43.09] },
  { slug: "albacete", name: "Albacete", code: "ES-AB", center: { lat: 38.99, lng: -1.85 }, bbox: [-2.52, 38.08, -1.10, 39.54] },
  { slug: "alicante", name: "Alicante", code: "ES-A", center: { lat: 38.35, lng: -0.49 }, bbox: [-1.07, 37.84, 0.53, 38.91] },
  { slug: "almeria", name: "Almería", code: "ES-AL", center: { lat: 37.23, lng: -2.47 }, bbox: [-3.05, 36.63, -1.63, 37.72] },
  { slug: "asturias", name: "Asturias", code: "ES-O", center: { lat: 43.26, lng: -5.86 }, bbox: [-7.21, 42.85, -4.51, 43.66] },
  { slug: "avila", name: "Ávila", code: "ES-AV", center: { lat: 40.66, lng: -5.00 }, bbox: [-5.72, 40.07, -4.60, 41.01] },
  { slug: "badajoz", name: "Badajoz", code: "ES-BA", center: { lat: 38.88, lng: -6.17 }, bbox: [-7.53, 37.87, -4.98, 39.50] },
  { slug: "barcelona", name: "Barcelona", code: "ES-B", center: { lat: 41.54, lng: 2.17 }, bbox: [1.01, 41.10, 2.91, 42.24] },
  { slug: "burgos", name: "Burgos", code: "ES-BU", center: { lat: 42.21, lng: -3.70 }, bbox: [-4.61, 41.22, -2.56, 43.01] },
  { slug: "caceres", name: "Cáceres", code: "ES-CC", center: { lat: 39.87, lng: -6.37 }, bbox: [-7.04, 39.08, -4.98, 40.49] },
  { slug: "cadiz", name: "Cádiz", code: "ES-CA", center: { lat: 36.54, lng: -5.80 }, bbox: [-6.54, 35.90, -5.08, 37.08] },
  { slug: "cantabria", name: "Cantabria", code: "ES-S", center: { lat: 43.18, lng: -4.02 }, bbox: [-4.86, 42.76, -3.13, 43.51] },
  { slug: "castellon", name: "Castellón", code: "ES-CS", center: { lat: 40.14, lng: -0.05 }, bbox: [-0.72, 39.47, 0.53, 40.79] },
  { slug: "ciudad-real", name: "Ciudad Real", code: "ES-CR", center: { lat: 38.98, lng: -3.92 }, bbox: [-5.17, 38.22, -2.80, 39.61] },
  { slug: "cordoba", name: "Córdoba", code: "ES-CO", center: { lat: 37.89, lng: -4.78 }, bbox: [-5.49, 37.17, -3.83, 38.75] },
  { slug: "a-coruna", name: "A Coruña", code: "ES-C", center: { lat: 43.25, lng: -8.40 }, bbox: [-9.30, 42.73, -7.64, 43.78] },
  { slug: "cuenca", name: "Cuenca", code: "ES-CU", center: { lat: 40.07, lng: -2.13 }, bbox: [-3.12, 39.32, -1.07, 40.77] },
  { slug: "girona", name: "Girona", code: "ES-GI", center: { lat: 41.98, lng: 2.82 }, bbox: [2.00, 41.54, 3.33, 42.49] },
  { slug: "granada", name: "Granada", code: "ES-GR", center: { lat: 37.18, lng: -3.60 }, bbox: [-4.07, 36.53, -2.82, 38.06] },
  { slug: "guadalajara", name: "Guadalajara", code: "ES-GU", center: { lat: 40.79, lng: -2.42 }, bbox: [-3.30, 40.37, -1.59, 41.37] },
  { slug: "guipuzcoa", name: "Gipuzkoa", code: "ES-SS", center: { lat: 43.17, lng: -2.06 }, bbox: [-2.54, 42.96, -1.58, 43.37] },
  { slug: "huelva", name: "Huelva", code: "ES-H", center: { lat: 37.55, lng: -6.95 }, bbox: [-7.52, 37.07, -6.20, 38.04] },
  { slug: "huesca", name: "Huesca", code: "ES-HU", center: { lat: 42.14, lng: -0.41 }, bbox: [-1.90, 41.66, 0.73, 42.96] },
  { slug: "jaen", name: "Jaén", code: "ES-J", center: { lat: 37.77, lng: -3.79 }, bbox: [-4.27, 37.38, -2.50, 38.66] },
  { slug: "la-rioja", name: "La Rioja", code: "ES-LO", center: { lat: 42.29, lng: -2.44 }, bbox: [-3.07, 41.92, -1.58, 42.65] },
  { slug: "las-palmas", name: "Las Palmas", code: "ES-GC", center: { lat: 28.11, lng: -15.41 }, bbox: [-16.20, 27.63, -13.30, 29.48] },
  { slug: "leon", name: "León", code: "ES-LE", center: { lat: 42.60, lng: -5.56 }, bbox: [-7.07, 41.72, -4.53, 43.00] },
  { slug: "lleida", name: "Lleida", code: "ES-L", center: { lat: 41.86, lng: 0.97 }, bbox: [0.27, 41.40, 1.76, 42.76] },
  { slug: "lugo", name: "Lugo", code: "ES-LU", center: { lat: 43.01, lng: -7.55 }, bbox: [-7.75, 42.40, -6.69, 43.56] },
  { slug: "madrid", name: "Madrid", code: "ES-M", center: { lat: 40.42, lng: -3.71 }, bbox: [-4.57, 39.88, -3.05, 41.17] },
  { slug: "malaga", name: "Málaga", code: "ES-MA", center: { lat: 36.72, lng: -4.55 }, bbox: [-5.40, 36.30, -3.80, 37.24] },
  { slug: "murcia", name: "Murcia", code: "ES-MU", center: { lat: 38.00, lng: -1.49 }, bbox: [-2.33, 37.34, -0.61, 38.65] },
  { slug: "navarra", name: "Navarra", code: "ES-NA", center: { lat: 42.70, lng: -1.64 }, bbox: [-2.50, 41.91, -0.72, 43.31] },
  { slug: "ourense", name: "Ourense", code: "ES-OR", center: { lat: 42.34, lng: -7.36 }, bbox: [-8.01, 41.84, -6.74, 42.67] },
  { slug: "palencia", name: "Palencia", code: "ES-P", center: { lat: 42.42, lng: -4.53 }, bbox: [-4.97, 41.83, -3.90, 42.98] },
  { slug: "pontevedra", name: "Pontevedra", code: "ES-PO", center: { lat: 42.43, lng: -8.64 }, bbox: [-8.88, 41.82, -7.99, 42.59] },
  { slug: "salamanca", name: "Salamanca", code: "ES-SA", center: { lat: 40.95, lng: -6.21 }, bbox: [-7.00, 40.22, -5.55, 41.22] },
  { slug: "santa-cruz-de-tenerife", name: "S.C. Tenerife", code: "ES-TF", center: { lat: 28.46, lng: -16.25 }, bbox: [-18.16, 27.63, -13.45, 29.45] },
  { slug: "segovia", name: "Segovia", code: "ES-SG", center: { lat: 40.94, lng: -4.12 }, bbox: [-4.60, 40.55, -3.48, 41.35] },
  { slug: "sevilla", name: "Sevilla", code: "ES-SE", center: { lat: 37.39, lng: -5.59 }, bbox: [-6.57, 36.78, -4.76, 38.04] },
  { slug: "soria", name: "Soria", code: "ES-SO", center: { lat: 41.77, lng: -2.47 }, bbox: [-3.16, 40.82, -1.76, 42.09] },
  { slug: "tarragona", name: "Tarragona", code: "ES-T", center: { lat: 41.12, lng: 1.25 }, bbox: [0.53, 40.63, 1.53, 41.48] },
  { slug: "teruel", name: "Teruel", code: "ES-TE", center: { lat: 40.34, lng: -0.68 }, bbox: [-1.90, 39.87, 0.27, 41.05] },
  { slug: "toledo", name: "Toledo", code: "ES-TO", center: { lat: 39.86, lng: -4.02 }, bbox: [-5.38, 39.11, -2.80, 40.37] },
  { slug: "valencia", name: "Valencia", code: "ES-V", center: { lat: 39.47, lng: -0.38 }, bbox: [-1.53, 38.70, 0.53, 39.98] },
  { slug: "valladolid", name: "Valladolid", code: "ES-VA", center: { lat: 41.65, lng: -4.72 }, bbox: [-5.48, 41.08, -4.05, 42.07] },
  { slug: "vizcaya", name: "Vizcaya", code: "ES-BI", center: { lat: 43.22, lng: -2.92 }, bbox: [-3.45, 43.05, -2.52, 43.45] },
  { slug: "zamora", name: "Zamora", code: "ES-ZA", center: { lat: 41.50, lng: -5.74 }, bbox: [-6.92, 41.07, -5.61, 42.19] },
  { slug: "zaragoza", name: "Zaragoza", code: "ES-Z", center: { lat: 41.60, lng: -1.02 }, bbox: [-1.98, 40.56, 0.27, 42.33] },
];

export function findProvinceBySlug(slug: string): Province | undefined {
  return PROVINCES.find((p) => p.slug === slug);
}

export function pointInProvince(
  lat: number,
  lng: number,
  province: Province,
): boolean {
  const [minLng, minLat, maxLng, maxLat] = province.bbox;
  return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
}

export function detectProvince(lat: number, lng: number): Province | undefined {
  for (const province of PROVINCES) {
    if (pointInProvince(lat, lng, province)) return province;
  }
  return undefined;
}

/* The `MOCK_FIRES` array previously exported from this module (a 20-point
 * curated Spanish fire dataset used as a graceful fallback when no
 * NASA FIRMS API key was configured) has been removed. The app now
 * never serves fake data: with no key, `getFires()` returns an empty
 * dataset with `reason: "no-key"` so the UI can show an actionable
 * "configura NASA_FIRMS_API_KEY" message instead of misleading the
 * user with a demo. See `lib/firms/client.ts`. */
