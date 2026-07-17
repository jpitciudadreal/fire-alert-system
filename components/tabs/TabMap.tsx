"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import MapShell, { type FireMapView } from "@/components/map/MapShell";
import { Badge } from "@/components/ui/Badge";
import type { FirePoint, FireResponse } from "@/types";

/**
 * Tab "Mapa en vivo" de fire-alert-web, adaptado a Leaflet.
 *
 * Comportamiento actual:
 *   - El mapa ocupa el alto completo disponible (la página = viewport
 *     menos header+tabs+footer; aquí se usa `height="fill"` y la cadena
 *     <main flex-1 overflow-hidden> + <div h-full w-full> propaga el
 *     alto).
 *   - El panel lateral muestra los 5 focos MÁS RECIENTES (ordenados
 *     por `acq_date+acq_time` descendente) y un botón "Ver más →" que
 *     delega al padre (`app/page.tsx`) cambiar a la pestaña Historial.
 *   - Toolbar superior monospaced con `N focos activos` + botón
 *     `↻ Actualizar` (réplica del subproyecto).
 */

interface TabMapProps {
  /**
   * Callback invocado por el botón "Ver más" del panel lateral.
   * El padre (la página tabbed) decide a qué pestaña saltar — aquí
   * sólo señalizamos la intención para evitar que TabMap conozca el
   * estado global.
   */
  onShowHistory?: () => void;
}

const RECENT_COUNT = 10;

// Sentinel que usamos como timestamp de ordenación para campos faltantes.
// Lo dejamos muy en el pasado para que los fuegos sin `acq_date` caigan al
// final de la lista, no al principio.
const FALLBACK_SORT_KEY = "0000-00-00 0000";

function sortKey(f: FirePoint): string {
  if (!f.acq_date) return FALLBACK_SORT_KEY;
  // acq_time viene como "HHMM" o vacío; padding defensivo para alinear
  // sorting lexicográfico con orden cronológico.
  const paddedTime = (f.acq_time ?? "").padStart(4, "0");
  return `${f.acq_date} ${paddedTime}`;
}

/* -------------------------------------------------------------------------- */
/*                       Límite por temporada de incendios                     */
/* -------------------------------------------------------------------------- */
/**
 * En España los picos de detección NRT caen en julio-octubre (olas de
 * calor con frentes secos). Fuera de esa ventana es raro pasar de 200
 * focos/24h, dentro de ella se ha llegado a ~500 en picos históricos.
 *
 * Subir el `?limit` en temporada alta nos asegura que el mapa no se
 * quede corto el día que importa; Leaflet con `CircleMarker` aguanta
 * holgadamente 500 markers (la ralentización perceptible aparece a
 * partir de ~5k). Mantener el `useCallback` keyed por el valor del
 * límite garantiza que un transition seasonal sea una sola petición más,
 * no un bucle de fetches.
 */
const OFF_SEASON_LIMIT = 200;
const HIGH_SEASON_LIMIT = 500;
// 0-indexed: jul=6, ago=7, sep=8, oct=9.
const HIGH_SEASON_MONTHS = new Set([6, 7, 8, 9]);

function isHighSeason(now: Date = new Date()): boolean {
  return HIGH_SEASON_MONTHS.has(now.getMonth());
}

export default function TabMap({ onShowHistory }: TabMapProps = {}) {
  const [fires, setFires] = useState<FirePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<FirePoint | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  // Capa base del mapa. Por defecto dark (CartoDB); el usuario puede
  // alternar a satélite (Esri World Imagery) para ver ortofoto y
  // cotejar la posición exacta del foco contra el terreno.
  const [view, setView] = useState<FireMapView>("satellite");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Subimos a 500 en temporada alta (jul-oct) para absorber picos
      // de detección NRT. Fuera de temporada, 200 cubre de sobra el
      // escenario típico y mantiene el render ligero.
      const limit = isHighSeason() ? HIGH_SEASON_LIMIT : OFF_SEASON_LIMIT;
      const res = await fetch(`/api/fires?limit=${limit}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as FireResponse;
      setFires(data.fires ?? []);
      setLastUpdate(new Date());
    } catch (e) {
      console.error("[TabMap] load failed:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Filtros interactivos para la cabecera
  const [filterConfidence, setFilterConfidence] = useState<"both" | "nominal" | "high">("both");
  const [minBrightness, setMinBrightness] = useState<number>(0);
  const [minFrp, setMinFrp] = useState<number>(0);

  // Filtrar para mostrar estrictamente los fuegos de las últimas 24 horas en el mapa
  const firesToday = useMemo(() => {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    return fires.filter((f) => {
      // 1. Eliminar focos de confianza baja ("low")
      if (f.confidence === "low") return false;

      // 2. Filtro de confianza interactivo (nominal, alta o ambas)
      if (filterConfidence === "nominal" && f.confidence !== "nominal") return false;
      if (filterConfidence === "high" && f.confidence !== "high") return false;

      // 3. Filtro interactivo de temperatura de brillo mínima (Kelvin)
      if (f.brightness < minBrightness) return false;

      // 4. Filtro interactivo de FRP mínimo (MW)
      if (minFrp > 0 && f.frp < minFrp) return false;

      // 5. Límite estricto de últimas 24 horas
      if (!f.acq_date) return false;
      const dateParts = f.acq_date.split("-"); // YYYY-MM-DD
      if (dateParts.length !== 3) return false;
      const fireDate = new Date(
        Number(dateParts[0]),
        Number(dateParts[1]) - 1,
        Number(dateParts[2])
      );
      if (f.acq_time && f.acq_time.length === 4) {
        fireDate.setHours(Number(f.acq_time.slice(0, 2)));
        fireDate.setMinutes(Number(f.acq_time.slice(2, 4)));
      }
      return fireDate >= oneDayAgo;
    });
  }, [fires, filterConfidence, minBrightness, minFrp]);

  // Mantén la lista completa para el mapa (los markers pintan tanto
  // los 200 de fuera de temporada como los 500 de temporada alta — el
  // aside sólo necesita los RECENT_COUNT más recientes).
  const recentFires = useMemo(
    () =>
      [...firesToday]
        .sort((a, b) => sortKey(b).localeCompare(sortKey(a)))
        .slice(0, RECENT_COUNT),
    [firesToday],
  );

  return (
    <div className="flex h-full w-full min-h-0 flex-col overflow-hidden lg:flex-row">
      {/* Mapa */}
      {/* `min-w-0` permite que la zona crezca en flex-row sin empujar a
         la `<aside>` fuera del viewport (default min-width: auto bloquearía
         el shrink horizontal). `min-h-0` idem para eje vertical. */}
      <div className="relative flex-1 min-h-0 min-w-0 overflow-hidden bg-base">
        <div className="scan-line" />

         {/* Toolbar superior */}
        <div className="pointer-events-auto absolute left-3 right-3 top-3 z-[1000] flex flex-wrap items-center justify-between gap-2">
          {/* Filtros izquierdos */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro Confianza */}
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface/90 px-3 py-1 text-xs text-textSecondary">
              <span className="font-mono">Confianza:</span>
              <select
                value={filterConfidence}
                onChange={(e) => setFilterConfidence(e.target.value as any)}
                className="bg-transparent text-textPrimary outline-none cursor-pointer font-semibold"
              >
                <option value="both" className="bg-surface">Nominal + Alta</option>
                <option value="nominal" className="bg-surface">Solo Nominal</option>
                <option value="high" className="bg-surface">Solo Alta</option>
              </select>
            </div>

            {/* Filtro Brillo mínimo */}
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface/90 px-3 py-1 text-xs text-textSecondary">
              <span className="font-mono">Brillo mín:</span>
              <input
                type="number"
                min="0"
                max="500"
                step="10"
                value={minBrightness || ""}
                onChange={(e) => setMinBrightness(Number(e.target.value) || 0)}
                placeholder="0 K"
                className="w-16 bg-transparent text-textPrimary outline-none font-semibold font-mono"
              />
              <span className="text-[10px]">K</span>
            </div>

            {/* Filtro FRP mínimo */}
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface/90 px-3 py-1 text-xs text-textSecondary">
              <span className="font-mono">FRP mín:</span>
              <input
                type="number"
                min="0"
                max="2000"
                step="10"
                value={minFrp || ""}
                onChange={(e) => setMinFrp(Number(e.target.value) || 0)}
                placeholder="0 MW"
                className="w-16 bg-transparent text-textPrimary outline-none font-semibold font-mono"
              />
              <span className="text-[10px]">MW</span>
            </div>
          </div>

          {/* Controles derechos (badge + toggle capa + actualizar).
              Agrupados para que `justify-between` los separe del pill
              izquierdo y, al envolver, no se monten encima del mapa. */}
          <div className="flex flex-wrap items-center gap-2">
            {/*
              Badge requerido por el usuario: contador de focos activos
              justo a la derecha del botón Actualizar. Tone fijo en
              "high" (rojo, color de marca del sistema de alerta) para
              refuerzo visual constante — la app es sobre incendios, el
              indicador principal debe leerse como "alerta activa". El
              contenido sigue reflejando el estado real del fetch y
              número de detecciones.
            */}
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface/90 px-3 py-1.5">
              <span
                className={`h-2 w-2 rounded-full ${loading ? "bg-fire animate-pulse" : "bg-fire"}`}
              />
              <span className="font-mono text-xs text-textSecondary">
                {loading ? "Cargando..." : `${firesToday.length} focos activos`}
              </span>
            </div>

            {/*
              Toggle de capa base (dark ↔ satellite). El texto del botón
              cambia para reflejar la ACCIÓN disponible ("Satélite"
              cuando estás en dark ⇒ "ir a satélite"; "Mapa" cuando
              estás en satellite ⇒ "volver al mapa"). El emoji ayuda a
              identificar visualmente la capa destino sin abrir tooltips.
            */}
            <button
              type="button"
              onClick={() => setView(view === "dark" ? "satellite" : "dark")}
              title={
                view === "dark"
                  ? "Cambiar a vista satélite"
                  : "Volver a mapa político"
              }
              aria-label={
                view === "dark"
                  ? "Cambiar a vista satélite"
                  : "Volver a mapa político"
              }
              className="rounded-lg border border-border bg-surface/90 px-3 py-1.5 font-mono text-xs text-textSecondary transition-colors hover:border-fire hover:text-textPrimary"
            >
              {view === "dark" ? "🛰️ Satélite" : "🗺️ Mapa"}
            </button>

            <button
              onClick={load}
              disabled={loading}
              className="rounded-lg border border-border bg-surface/90 px-3 py-1.5 font-mono text-xs text-textSecondary transition-colors hover:border-fire hover:text-textPrimary disabled:opacity-50"
            >
              {loading ? "⟳" : "↻ Actualizar"}
            </button>
          </div>
        </div>

        <MapShell fires={firesToday} height="fill" view={view} />

        {/* Última actualización */}
        {lastUpdate ? (
          <div className="absolute bottom-3 right-3 z-[1000] rounded border border-border bg-surface/90 px-2 py-1 font-mono text-xs text-textSecondary">
            {lastUpdate.toLocaleTimeString("es-ES")}
          </div>
        ) : null}
      </div>

      {/* Panel lateral — siempre ocupa todo el alto, con scroll interno.
          Estructura flex:
          - `flex-1`         → grow por defecto (mobile: comparte alto
                              50/50 con la zona mapa en flex-col).
          - `min-h-0`        → permite que el `height: 100%` se
                              aplique correctamente en flex layout
                              (default `min-height: auto` lo colapsa).
          - `lg:flex-none`   → anula el `flex-1` en desktop (lg:flex-row)
                              porque `lg:w-80` impone ancho fijo de 320
                              px; el cross-axis stretch ya cubre el
                              alto de la fila sin necesidad de crecer.
          - `lg:w-80`        → ancho fijo desktop (320 px).      */}
      <aside className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden border-l border-border bg-surface lg:flex-none lg:w-80">
        {selected ? (
          <>
            {/* Header sticky del detalle — mismo borde inferior que el
                estado "no-seleccionado" para coherencia visual. */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="font-semibold text-textPrimary">
                Detalle del foco
              </h2>
              <button
                onClick={() => setSelected(null)}
                className="text-lg text-textSecondary hover:text-textPrimary"
                aria-label="Cerrar detalle"
              >
                ✕
              </button>
            </div>
            <div className="animate-fade-in flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {[
                  ["ID", selected.fire_id, true],
                  ["Satélite", selected.satellite],
                  ["Latitud", selected.latitude.toFixed(4)],
                  ["Longitud", selected.longitude.toFixed(4)],
                  ["Confianza", selected.confidence],
                  ["Brillo (Ti4)", `${selected.brightness.toFixed(1)} K`],
                  ["FRP", `${selected.frp.toFixed(1)} MW`],
                  ["Fecha", selected.acq_date],
                  ["Hora (UTC)", selected.acq_time],
                  ["Provincia", selected.province ?? "—"],
                ].map(([label, value, mono]) => (
                  <div
                    key={String(label)}
                    className="flex items-start justify-between gap-2"
                  >
                    <span className="flex-shrink-0 text-xs text-textSecondary">
                      {label}
                    </span>
                    <span
                      className={`break-all text-right text-xs ${
                        mono ? "font-mono text-amber" : "text-textPrimary"
                      }`}
                    >
                      {String(value ?? "—")}
                    </span>
                  </div>
                ))}
              </div>
              <a
                href={`https://www.google.com/maps?q=${selected.latitude},${selected.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 block w-full rounded-lg border border-fire/30 bg-fire/10 py-2 text-center text-sm text-fire transition-colors hover:bg-fire/20"
              >
                Ver en Google Maps →
              </a>
            </div>
          </>
        ) : (
          <>
            <div className="border-b border-border px-4 py-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-textPrimary">
                  Focos activos
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-wider text-textSecondary">
                  Top {RECENT_COUNT} recientes
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="py-12 text-center font-mono text-sm text-textSecondary">
                  Cargando...
                </div>
              ) : firesToday.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mb-2 text-3xl">✅</div>
                  <div className="text-sm text-textSecondary">
                    Sin focos detectados
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentFires.map((fire) => (
                    <button
                      key={fire.fire_id}
                      onClick={() => setSelected(fire)}
                      className="w-full rounded-lg border border-border bg-base p-3 text-left transition-colors hover:border-fire/50"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <span
                          className="h-2 w-2 flex-shrink-0 rounded-full"
                          style={{
                            background:
                              fire.confidence === "high"
                                ? "#FF4500"
                                : fire.confidence === "nominal"
                                  ? "#F5A623"
                                  : "#8B9DC3",
                          }}
                        />
                        <span className="text-xs font-semibold capitalize text-textPrimary">
                          {(fire.province ?? "—").replace(/-/g, " ")}
                        </span>
                        <span className="ml-auto font-mono text-xs text-amber">
                          {fire.brightness.toFixed(0)} K
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="font-mono text-xs text-textSecondary">
                          {fire.latitude.toFixed(3)}, {fire.longitude.toFixed(3)}
                        </div>
                        {fire.frp > 0 && (
                          <span className="font-mono text-xs text-orange-400">
                            {fire.frp.toFixed(0)} MW
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 font-mono text-xs text-textSecondary">
                        {fire.acq_date} {fire.acq_time}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

          </>
        )}
      </aside>
    </div>
  );
}
