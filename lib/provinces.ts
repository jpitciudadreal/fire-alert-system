/**
 * 52 provincias españolas con bbox y comunidad autónoma.
 *
 * Réplica fiel del `fire-alert-web/lib/provinces.ts` adaptada al
 * modelo del proyecto actual (cada `Province` lleva `slug` que es la
 * clave de unión con `subscriptions.province_slug` y con la detección
 * de incendios en `lib/firms/client.ts`).
 *
 * Geometría: centroides aproximados y bbox hand-tuned por comunidad.
 * Si añadís o quitáis provincias aquí, actualizad también el subproyecto
 * `fire-alert-web` para mantener paridad visual.
 */

export interface Province {
  id: string;
  slug: string;
  name: string;
  bbox: [number, number, number, number]; // [west, south, east, north]
  center: [number, number];               // [lng, lat]
  comunidad: string;
}

export const PROVINCES: Province[] = [
  { id: "alava",               slug: "alava",               name: "Álava",                   bbox: [-3.18, 42.56, -2.27, 43.09], center: [-2.73, 42.84], comunidad: "País Vasco" },
  { id: "albacete",            slug: "albacete",            name: "Albacete",                bbox: [-2.52, 38.08, -1.10, 39.54], center: [-1.85, 38.99], comunidad: "Castilla-La Mancha" },
  { id: "alicante",            slug: "alicante",            name: "Alicante",                bbox: [-1.07, 37.84,  0.53, 38.91], center: [-0.49, 38.35], comunidad: "Comunitat Valenciana" },
  { id: "almeria",             slug: "almeria",             name: "Almería",                 bbox: [-3.05, 36.63, -1.63, 37.72], center: [-2.47, 37.23], comunidad: "Andalucía" },
  { id: "asturias",            slug: "asturias",            name: "Asturias",                bbox: [-7.21, 42.85, -4.51, 43.66], center: [-5.86, 43.26], comunidad: "Asturias" },
  { id: "avila",               slug: "avila",               name: "Ávila",                   bbox: [-5.72, 40.07, -4.60, 41.01], center: [-5.00, 40.66], comunidad: "Castilla y León" },
  { id: "badajoz",             slug: "badajoz",             name: "Badajoz",                 bbox: [-7.53, 37.87, -4.98, 39.50], center: [-6.17, 38.88], comunidad: "Extremadura" },
  { id: "barcelona",           slug: "barcelona",           name: "Barcelona",               bbox: [ 1.01, 41.10,  2.91, 42.24], center: [ 2.17, 41.54], comunidad: "Catalunya" },
  { id: "burgos",              slug: "burgos",              name: "Burgos",                  bbox: [-4.61, 41.22, -2.56, 43.01], center: [-3.70, 42.21], comunidad: "Castilla y León" },
  { id: "caceres",             slug: "caceres",             name: "Cáceres",                 bbox: [-7.04, 39.08, -4.98, 40.49], center: [-6.37, 39.87], comunidad: "Extremadura" },
  { id: "cadiz",               slug: "cadiz",               name: "Cádiz",                   bbox: [-6.54, 35.90, -5.08, 37.08], center: [-5.80, 36.54], comunidad: "Andalucía" },
  { id: "cantabria",           slug: "cantabria",           name: "Cantabria",               bbox: [-4.86, 42.76, -3.13, 43.51], center: [-4.02, 43.18], comunidad: "Cantabria" },
  { id: "castellon",           slug: "castellon",           name: "Castellón",               bbox: [-0.72, 39.47,  0.53, 40.79], center: [-0.05, 40.14], comunidad: "Comunitat Valenciana" },
  { id: "ciudad_real",         slug: "ciudad-real",         name: "Ciudad Real",             bbox: [-5.17, 38.22, -2.80, 39.61], center: [-3.92, 38.98], comunidad: "Castilla-La Mancha" },
  { id: "cordoba",             slug: "cordoba",             name: "Córdoba",                 bbox: [-5.49, 37.17, -3.83, 38.75], center: [-4.78, 37.89], comunidad: "Andalucía" },
  { id: "a_coruna",            slug: "a-coruna",            name: "A Coruña",                bbox: [-9.30, 42.73, -7.64, 43.78], center: [-8.40, 43.25], comunidad: "Galicia" },
  { id: "cuenca",              slug: "cuenca",              name: "Cuenca",                  bbox: [-3.12, 39.32, -1.07, 40.77], center: [-2.13, 40.07], comunidad: "Castilla-La Mancha" },
  { id: "girona",              slug: "girona",              name: "Girona",                  bbox: [ 2.00, 41.54,  3.33, 42.49], center: [ 2.82, 41.98], comunidad: "Catalunya" },
  { id: "granada",             slug: "granada",             name: "Granada",                 bbox: [-4.07, 36.53, -2.82, 38.06], center: [-3.60, 37.18], comunidad: "Andalucía" },
  { id: "guadalajara",         slug: "guadalajara",         name: "Guadalajara",             bbox: [-3.30, 40.37, -1.59, 41.37], center: [-2.42, 40.79], comunidad: "Castilla-La Mancha" },
  { id: "guipuzcoa",           slug: "guipuzcoa",           name: "Gipuzkoa",                bbox: [-2.54, 42.96, -1.58, 43.37], center: [-2.06, 43.17], comunidad: "País Vasco" },
  { id: "huelva",              slug: "huelva",              name: "Huelva",                  bbox: [-7.52, 37.07, -6.20, 38.04], center: [-6.95, 37.55], comunidad: "Andalucía" },
  { id: "huesca",              slug: "huesca",              name: "Huesca",                  bbox: [-1.90, 41.66,  0.73, 42.96], center: [-0.41, 42.14], comunidad: "Aragón" },
  { id: "jaen",                slug: "jaen",                name: "Jaén",                    bbox: [-4.27, 37.38, -2.50, 38.66], center: [-3.79, 37.77], comunidad: "Andalucía" },
  { id: "la_rioja",            slug: "la-rioja",            name: "La Rioja",                bbox: [-3.07, 41.92, -1.58, 42.65], center: [-2.44, 42.29], comunidad: "La Rioja" },
  { id: "las_palmas",          slug: "las-palmas",          name: "Las Palmas",              bbox: [-16.20, 27.63, -13.30, 29.48], center: [-15.41, 28.11], comunidad: "Canarias" },
  { id: "leon",                slug: "leon",                name: "León",                    bbox: [-7.07, 41.72, -4.53, 43.00], center: [-5.56, 42.60], comunidad: "Castilla y León" },
  { id: "lleida",              slug: "lleida",              name: "Lleida",                  bbox: [ 0.27, 41.40,  1.76, 42.76], center: [ 0.97, 41.86], comunidad: "Catalunya" },
  { id: "lugo",                slug: "lugo",                name: "Lugo",                    bbox: [-7.75, 42.40, -6.69, 43.56], center: [-7.55, 43.01], comunidad: "Galicia" },
  { id: "madrid",              slug: "madrid",              name: "Madrid",                  bbox: [-4.57, 39.88, -3.05, 41.17], center: [-3.71, 40.42], comunidad: "Comunidad de Madrid" },
  { id: "malaga",              slug: "malaga",              name: "Málaga",                  bbox: [-5.40, 36.30, -3.80, 37.24], center: [-4.55, 36.72], comunidad: "Andalucía" },
  { id: "murcia",              slug: "murcia",              name: "Murcia",                  bbox: [-2.33, 37.34, -0.61, 38.65], center: [-1.49, 38.00], comunidad: "Región de Murcia" },
  { id: "navarra",             slug: "navarra",             name: "Navarra",                 bbox: [-2.50, 41.91, -0.72, 43.31], center: [-1.64, 42.70], comunidad: "Navarra" },
  { id: "ourense",             slug: "ourense",             name: "Ourense",                 bbox: [-8.01, 41.84, -6.74, 42.67], center: [-7.36, 42.34], comunidad: "Galicia" },
  { id: "palencia",            slug: "palencia",            name: "Palencia",                bbox: [-4.97, 41.83, -3.90, 42.98], center: [-4.53, 42.42], comunidad: "Castilla y León" },
  { id: "pontevedra",          slug: "pontevedra",          name: "Pontevedra",              bbox: [-8.88, 41.82, -7.99, 42.59], center: [-8.64, 42.43], comunidad: "Galicia" },
  { id: "salamanca",           slug: "salamanca",           name: "Salamanca",               bbox: [-7.00, 40.22, -5.55, 41.22], center: [-6.21, 40.95], comunidad: "Castilla y León" },
  { id: "santa_cruz_tenerife", slug: "santa-cruz-de-tenerife", name: "S.C. Tenerife",         bbox: [-18.16, 27.63, -13.45, 29.45], center: [-16.25, 28.46], comunidad: "Canarias" },
  { id: "segovia",             slug: "segovia",             name: "Segovia",                 bbox: [-4.60, 40.55, -3.48, 41.35], center: [-4.12, 40.94], comunidad: "Castilla y León" },
  { id: "sevilla",             slug: "sevilla",             name: "Sevilla",                 bbox: [-6.57, 36.78, -4.76, 38.04], center: [-5.59, 37.39], comunidad: "Andalucía" },
  { id: "soria",               slug: "soria",               name: "Soria",                   bbox: [-3.16, 40.82, -1.76, 42.09], center: [-2.47, 41.77], comunidad: "Castilla y León" },
  { id: "tarragona",           slug: "tarragona",           name: "Tarragona",               bbox: [ 0.53, 40.63,  1.53, 41.48], center: [ 1.25, 41.12], comunidad: "Catalunya" },
  { id: "teruel",              slug: "teruel",              name: "Teruel",                  bbox: [-1.90, 39.87,  0.27, 41.05], center: [-0.68, 40.34], comunidad: "Aragón" },
  { id: "toledo",              slug: "toledo",              name: "Toledo",                  bbox: [-5.38, 39.11, -2.80, 40.37], center: [-4.02, 39.86], comunidad: "Castilla-La Mancha" },
  { id: "valencia",            slug: "valencia",            name: "Valencia",                bbox: [-1.53, 38.70,  0.53, 39.98], center: [-0.38, 39.47], comunidad: "Comunitat Valenciana" },
  { id: "valladolid",          slug: "valladolid",          name: "Valladolid",              bbox: [-5.48, 41.08, -4.05, 42.07], center: [-4.72, 41.65], comunidad: "Castilla y León" },
  { id: "vizcaya",             slug: "vizcaya",             name: "Vizcaya",                 bbox: [-3.45, 43.05, -2.52, 43.45], center: [-2.92, 43.22], comunidad: "País Vasco" },
  { id: "zamora",              slug: "zamora",              name: "Zamora",                  bbox: [-6.92, 41.07, -5.61, 42.19], center: [-5.74, 41.50], comunidad: "Castilla y León" },
  { id: "zaragoza",            slug: "zaragoza",            name: "Zaragoza",                bbox: [-1.98, 40.56,  0.27, 42.33], center: [-1.02, 41.60], comunidad: "Aragón" },
];

export function getProvince(idOrSlug: string): Province | undefined {
  return PROVINCES.find((p) => p.id === idOrSlug || p.slug === idOrSlug);
}

export function groupByComunidad(): Record<string, Province[]> {
  return PROVINCES.reduce((acc, p) => {
    (acc[p.comunidad] ??= []).push(p);
    return acc;
  }, {} as Record<string, Province[]>);
}

/**
 * Lista ordenada alfabéticamente — útil para los selectores.
 */
export const PROVINCES_SORTED = [...PROVINCES].sort((a, b) =>
  a.name.localeCompare(b.name, "es")
);
