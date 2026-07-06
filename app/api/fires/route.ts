import { getFires } from "@/lib/firms/client";
import { detectProvince } from "@/lib/data/provinces";
import type { FireResponse, FirePoint } from "@/types";

/**
 * GET /api/fires
 *
 * Endpoint público que devuelve los focos activos en España.
 *
 * Soporta los siguientes query params (alineados con la UI de pestañas
 * `TabHistory` / `TabMap` estilo fire-alert-web):
 *
 *   - `limit`         → máximo de focos a devolver (1..1000).
 *                       Por defecto 200 si se omite o es inválido.
 *                       1000 es un techo blando: cubre los picos
 *                       absolutos de julio-octubre en España sin
 *                       permitir que un cliente abuse de la memoria
 *                       del fetch de Next o del propio cliente JS.
 *   - `province_id`   → filtra a una sola provincia por slug/bbox
 *   - `status`        → `active` (default) | `extinct`. En esta
 *                       versión `extinct` cae sobre el mismo dataset
 *                       (FIRMS NRT no aporta clasificación histórica);
 *                       se mantiene el parámetro para paridad visual
 *                       con el subproyecto.
 *
 * Errores de FIRMS nunca se silencian con datos sintéticos: la
 * respuesta incluye `reason` ("no-key" | "invalid-key" | "network" |
 * "empty") para que la UI muestre un mensaje accionable.
 *
 * Cuando `NASA_FIRMS_API_KEY` está configurado **y la respuesta es
 * real** (FIRMS devolvió datos), el handler cachea una hora. Cualquier
 * respuesta que NO venga de FIRMS (no-key / invalid-key / network) o
 * que lleve filtros por provincia/status usa `no-store` — devolver un
 * 1h stale de `{reason:"no-key", fires:[]}` a otro servidor con la
 * key recién configurada sería peor que un cache miss.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const limit = clampLimit(url.searchParams.get("limit"));
  const provinceSlug = url.searchParams.get("province_id")?.trim() || null;
  // `status` se acepta por paridad con el subproyecto; por ahora solo
  // distingue "active" (default) de "extinct" (semánticamente mismo dataset).
  const status = (url.searchParams.get("status")?.trim() || "active") as
    | "active"
    | "extinct";

  const payload: FireResponse = await getFires();

  // Aplicamos el filtrado cliente-side: el upstream ya devuelve solo
  // España, pero queremos slicing por provincia y por limit para que
  // las pestañas TabHistory/TabMap tengan control fino sin una segunda
  // llamada a FIRMS.
  const filtered: FirePoint[] =
    status === "extinct"
      ? [] // sin distinción efectiva en FIRMS NRT; mantenemos el contrato.
      : applyFilters(payload.fires, { provinceSlug, limit });

  const finalResponse: FireResponse & {
    filtered_by?: { province_slug: string | null; limit: number };
    total_in_spain?: number;
    status?: string;
  } = {
    ...payload,
    fires: filtered,
    count: filtered.length,
    filtered_by: { province_slug: provinceSlug, limit },
    total_in_spain: payload.fires.length,
    status,
  };

  // El cache agresivo (1h) sólo aplica a respuestas REALES de FIRMS sin
  // filtros. Cuando hay `province_id` o `status != active` cada
  // combinación generaría un bucket propio y/o devolvería datos
  // cacheados incorrectos. Cuando `reason` indica que NO consultamos
  // FIRMS con éxito (`no-key` / `invalid-key` / `network`), tampoco
  // queremos cachear el "estado vacío" durante una hora —回転 al
  // servidor con una key recién configurada se merece un MISS.
  const hasFilters = provinceSlug !== null || status !== "active";
  const failed = payload.reason && payload.reason !== "empty";
  const cacheControl =
    hasFilters || failed
      ? "no-store"
      : "public, s-maxage=3600, stale-while-revalidate=86400";

  return Response.json(finalResponse, {
    headers: {
      "Cache-Control": cacheControl,
      "X-Data-Source": payload.source,
    },
  });
}

function clampLimit(raw: string | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 200;
  // Techo 1000: suficiente para absorber el peor escenario de
  // detección NRT de España en 24h (~500-800 filas en agosto) sin
  // permitir abusar del revalidate cache de Next ni del runtime del
  // cliente (Leaflet empieza a resentirse a partir de 5k CircleMarkers
  // pero mantenemos mucho margen para futuros exportadores).
  return Math.min(1000, Math.max(1, Math.floor(n)));
}

function applyFilters(
  fires: FirePoint[],
  opts: { provinceSlug: string | null; limit: number }
): FirePoint[] {
  if (!opts.provinceSlug) {
    return fires.slice(0, opts.limit);
  }
  // Precomputamos la provincia una sola vez por cada fire para evitar
  // O(fires × provinces) cuando upstream no haya enriquecido el campo
  // `province`. Importa con NRT a 200-500 fuegos.
  const enriched = fires.map((f) => ({
    fire: f,
    provinceSlug:
      f.province ?? detectProvince(f.latitude, f.longitude)?.slug ?? null,
  }));
  return enriched
    .filter((e) => e.provinceSlug === opts.provinceSlug)
    .map((e) => e.fire)
    .slice(0, opts.limit);
}
