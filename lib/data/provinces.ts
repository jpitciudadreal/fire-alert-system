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
  {
    slug: "madrid",
    name: "Madrid",
    code: "ES-M",
    center: { lat: 40.4168, lng: -3.7038 },
    bbox: [-4.65, 39.85, -3.05, 41.15],
  },
  {
    slug: "toledo",
    name: "Toledo",
    code: "ES-TO",
    center: { lat: 39.8628, lng: -4.0273 },
    bbox: [-5.45, 39.25, -3.05, 40.45],
  },
  {
    slug: "ciudad-real",
    name: "Ciudad Real",
    code: "ES-CR",
    center: { lat: 38.9863, lng: -3.9297 },
    bbox: [-4.95, 38.35, -2.95, 39.75],
  },
  {
    slug: "caceres",
    name: "Cáceres",
    code: "ES-CC",
    center: { lat: 39.4752, lng: -6.3724 },
    bbox: [-7.55, 38.95, -5.05, 40.65],
  },
  {
    slug: "badajoz",
    name: "Badajoz",
    code: "ES-BA",
    center: { lat: 38.8781, lng: -6.9703 },
    bbox: [-7.45, 37.95, -5.75, 39.65],
  },
  {
    slug: "huelva",
    name: "Huelva",
    code: "ES-H",
    center: { lat: 37.2614, lng: -6.9447 },
    bbox: [-7.55, 36.95, -6.05, 38.25],
  },
  {
    slug: "sevilla",
    name: "Sevilla",
    code: "ES-SE",
    center: { lat: 37.3886, lng: -5.9823 },
    bbox: [-6.55, 36.95, -5.05, 38.05],
  },
  {
    slug: "cordoba",
    name: "Córdoba",
    code: "ES-CO",
    center: { lat: 37.8882, lng: -4.7794 },
    bbox: [-5.55, 37.15, -4.05, 38.45],
  },
  {
    slug: "jaen",
    name: "Jaén",
    code: "ES-J",
    center: { lat: 37.7657, lng: -3.7895 },
    bbox: [-4.45, 37.05, -2.85, 38.65],
  },
  {
    slug: "granada",
    name: "Granada",
    code: "ES-GR",
    center: { lat: 37.1773, lng: -3.5986 },
    bbox: [-4.45, 36.65, -2.55, 38.05],
  },
  {
    slug: "malaga",
    name: "Málaga",
    code: "ES-MA",
    center: { lat: 36.7212, lng: -4.4214 },
    bbox: [-5.65, 36.25, -3.65, 37.45],
  },
  {
    slug: "cadiz",
    name: "Cádiz",
    code: "ES-CA",
    center: { lat: 36.5298, lng: -6.2924 },
    bbox: [-6.55, 35.95, -5.05, 37.05],
  },
  {
    slug: "valladolid",
    name: "Valladolid",
    code: "ES-VA",
    center: { lat: 41.6521, lng: -4.724 },
    bbox: [-5.65, 40.85, -3.85, 42.35],
  },
  {
    slug: "zamora",
    name: "Zamora",
    code: "ES-ZA",
    center: { lat: 41.5036, lng: -5.7439 },
    bbox: [-7.05, 41.05, -5.45, 42.35],
  },
  {
    slug: "leon",
    name: "León",
    code: "ES-LE",
    center: { lat: 42.5987, lng: -5.5671 },
    bbox: [-7.35, 41.75, -4.85, 43.15],
  },
  {
    slug: "lugo",
    name: "Lugo",
    code: "ES-LU",
    center: { lat: 43.012, lng: -7.5559 },
    bbox: [-7.95, 42.55, -6.55, 43.85],
  },
  {
    slug: "ourense",
    name: "Ourense",
    code: "ES-OR",
    center: { lat: 42.336, lng: -7.8634 },
    bbox: [-8.35, 41.85, -6.85, 42.85],
  },
  {
    slug: "pontevedra",
    name: "Pontevedra",
    code: "ES-PO",
    center: { lat: 42.4293, lng: -8.6435 },
    bbox: [-8.95, 41.85, -8.05, 42.85],
  },
  {
    slug: "valencia",
    name: "Valencia",
    code: "ES-V",
    center: { lat: 39.4699, lng: -0.3763 },
    bbox: [-1.55, 38.55, 0.55, 40.15],
  },
  {
    slug: "castellon",
    name: "Castellón",
    code: "ES-CS",
    center: { lat: 39.9864, lng: -0.0513 },
    bbox: [-0.85, 39.55, 0.65, 40.85],
  },
  {
    slug: "alicante",
    name: "Alicante",
    code: "ES-A",
    center: { lat: 38.3452, lng: -0.4815 },
    bbox: [-1.15, 37.75, 0.45, 38.95],
  },
  {
    slug: "murcia",
    name: "Murcia",
    code: "ES-MU",
    center: { lat: 37.9842, lng: -1.3296 },
    bbox: [-2.25, 37.35, -0.65, 38.85],
  },
  {
    slug: "almeria",
    name: "Almería",
    code: "ES-AL",
    center: { lat: 36.8401, lng: -2.4599 },
    bbox: [-3.25, 36.25, -1.45, 37.85],
  },
  {
    slug: "zaragoza",
    name: "Zaragoza",
    code: "ES-Z",
    center: { lat: 41.6488, lng: -0.8891 },
    bbox: [-2.15, 40.85, 0.45, 42.15],
  },
  {
    slug: "huesca",
    name: "Huesca",
    code: "ES-HU",
    center: { lat: 42.1401, lng: -0.4084 },
    bbox: [-1.15, 41.45, 0.85, 42.95],
  },
  {
    slug: "lleida",
    name: "Lleida",
    code: "ES-L",
    center: { lat: 41.6173, lng: 0.6201 },
    bbox: [-1.45, 41.25, 1.85, 42.85],
  },
  {
    slug: "girona",
    name: "Girona",
    code: "ES-GI",
    center: { lat: 41.9794, lng: 2.8214 },
    bbox: [1.65, 41.55, 3.35, 42.65],
  },
  {
    slug: "barcelona",
    name: "Barcelona",
    code: "ES-B",
    center: { lat: 41.3851, lng: 2.1734 },
    bbox: [1.35, 41.15, 2.75, 41.85],
  },
  {
    slug: "tarragona",
    name: "Tarragona",
    code: "ES-T",
    center: { lat: 41.1189, lng: 1.2445 },
    bbox: [0.15, 40.45, 1.85, 41.55],
  },
  {
    slug: "illes-balears",
    name: "Illes Balears",
    code: "ES-IB",
    center: { lat: 39.6953, lng: 3.0176 },
    bbox: [1.15, 38.55, 4.45, 40.45],
  },
  {
    slug: "las-palmas",
    name: "Las Palmas",
    code: "ES-GC",
    center: { lat: 28.1235, lng: -15.4363 },
    bbox: [-15.95, 27.65, -13.45, 29.45],
  },
  {
    slug: "santa-cruz-de-tenerife",
    name: "Santa Cruz de Tenerife",
    code: "ES-TF",
    center: { lat: 28.2916, lng: -16.6291 },
    bbox: [-18.35, 27.65, -15.85, 28.95],
  },
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
