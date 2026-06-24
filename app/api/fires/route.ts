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
 *   - `limit`         → máximo de focos a devolver (1..500)
 *   - `province_id`   → filtra a una sola provincia por slug/bbox
 *   - `status`        → `active` (default) | `extinct`. En esta
 *                       versión `extinct` cae sobre el mismo dataset
 *                       (FIRMS NRT no aporta clasificación histórica);
 *                       se mantiene el parámetro para paridad visual
 *                       con el subproyecto.
 *
 * Cuando `NASA_FIRMS_API_KEY` está configurado, la respuesta se
 * cachea una hora (Next.js fetch revalidate); en demo mode (mock)
 * no se cachea para que los cambios manuales se vean al instante.
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

  // El cache agresivo (1h) sólo aplica a la respuesta sin filtros:
  // cuando hay `province_id` o `status != active` cada combinación
  // generaría un bucket propio y/o devolvería datos cacheados
  // incorrectos. `no-store` evita servir respuestas viejas entre
  // peticiones con filtros distintos en Vercel/CDN.
  const hasFilters = provinceSlug !== null || status !== "active";
  const cacheControl =
    payload.isMock || hasFilters
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
  return Math.min(500, Math.max(1, Math.floor(n)));
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
