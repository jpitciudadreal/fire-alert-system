"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { PROVINCES_SORTED } from "@/lib/provinces";
import type { FirePoint } from "@/types";

/**
 * Tab "Historial" — réplica de `fire-alert-web/components/TabHistory.tsx`.
 *
 * En este proyecto el dataset de FIRMS viene del mismo endpoint
 * `/api/fires` que el TabMap. Para aproximar "Historial" introducimos
 * dos modos de filtro:
 *   - `limit`   → máximo de focos a mostrar
 *   - `status`  → `ACTIVE` (default) u `EXTINCT` (placeholder; en
 *     realidad el FIRMS NRT sólo entrega detecciones recientes, y este
 *     filtro es semánticamente equivalente a mostrar otro subconjunto).
 *
 * Mantenemos la estética densa de fire-alert-web: stats cards, tabla
 * expandible, badges FRP por colores.
 */

const CONF_LABEL: Record<string, string> = {
  high:    "Alta",
  nominal: "Nominal",
  low:     "Baja",
};
const CONF_COLOR: Record<string, string> = {
  high:    "text-fire",
  nominal: "text-amber",
  low:     "text-textSecondary",
};

export default function TabHistory() {
  const [fires, setFires] = useState<FirePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProvince, setFilterProvince] = useState("");
  const [filterStatus, setStatus] = useState<"ACTIVE" | "EXTINCT">("ACTIVE");
  const [expanded, setExpanded] = useState<string | null>(null);

  // Nuevos filtros interactivos
  const [filterConfidence, setFilterConfidence] = useState<"both" | "nominal" | "high">("both");
  const [minBrightness, setMinBrightness] = useState<number>(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: "200",
        status: filterStatus === "ACTIVE" ? "active" : "extinct",
      });
      if (filterProvince) params.set("province_id", filterProvince);
      const res = await fetch(`/api/fires?${params.toString()}`, { cache: "no-store" });
      const data = (await res.json()) as { fires: FirePoint[] };
      setFires(data.fires ?? []);
    } finally {
      setLoading(false);
    }
  }, [filterProvince, filterStatus]);

  useEffect(() => {
    load();
  }, [load]);

  // Aplicar filtrado a los fuegos cargados
  const filteredFires = useMemo(() => {
    return fires.filter((f) => {
      // 1. Eliminar focos de confianza baja ("low")
      if (f.confidence === "low") return false;

      // 2. Filtro de confianza interactivo (nominal, alta o ambas)
      if (filterConfidence === "nominal" && f.confidence !== "nominal") return false;
      if (filterConfidence === "high" && f.confidence !== "high") return false;

      // 3. Filtro interactivo de temperatura de brillo mínima (Kelvin)
      if (f.brightness < minBrightness) return false;

      return true;
    });
  }, [fires, filterConfidence, minBrightness]);

  const getFrpBadge = (b: number) => {
    if (b > 380) return { label: "Muy alto", color: "bg-fire/20 text-fire" };
    if (b > 340) return { label: "Alto",     color: "bg-amber/20 text-amber" };
    if (b > 300) return { label: "Medio",    color: "bg-surfaceHi text-textSecondary" };
    return                { label: "Bajo",     color: "bg-surfaceHi text-textSecondary" };
  };

  const totalBrightness =
    filteredFires.length > 0
      ? filteredFires.reduce((s, f) => s + (f.brightness || 0), 0) / filteredFires.length
      : 0;

  return (
    <div className="mx-auto max-w-5xl animate-fade-in p-6 sm:p-8 h-full overflow-y-auto">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-textPrimary">
          Historial de detecciones
        </h1>
        <button
          onClick={load}
          disabled={loading}
          className="rounded-lg border border-border px-3 py-1.5 font-mono text-xs text-textSecondary transition-colors hover:border-fire/50 hover:text-fire disabled:opacity-50"
        >
          {loading ? "..." : "↻ Actualizar"}
        </button>
      </div>
      <p className="mb-6 text-sm text-textSecondary sm:text-base">
        Focos detectados por satélites NASA FIRMS (últimas 24h).
      </p>

      {/* Filtros */}
      <div className="mb-6 flex flex-wrap gap-4 rounded-xl border border-border bg-surface p-5">
        <div className="min-w-40 flex-1">
          <label className="mb-1 block font-mono text-xs uppercase tracking-wide text-textSecondary">
            Provincia
          </label>
          <select
            value={filterProvince}
            onChange={(e) => setFilterProvince(e.target.value)}
            className="w-full rounded-lg border border-border bg-base px-3 py-2 text-sm text-textPrimary outline-none transition-colors focus:border-fire"
          >
            <option value="">Todas las provincias</option>
            {PROVINCES_SORTED.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-36">
          <label className="mb-1 block font-mono text-xs uppercase tracking-wide text-textSecondary">
            Estado
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setStatus(e.target.value as "ACTIVE" | "EXTINCT")}
            className="w-full rounded-lg border border-border bg-base px-3 py-2 text-sm text-textPrimary outline-none transition-colors focus:border-fire"
          >
            <option value="ACTIVE">Activos</option>
            <option value="EXTINCT">Extinguidos</option>
          </select>
        </div>

        {/* Filtro Confianza */}
        <div className="min-w-40">
          <label className="mb-1 block font-mono text-xs uppercase tracking-wide text-textSecondary">
            Confianza
          </label>
          <select
            value={filterConfidence}
            onChange={(e) => setFilterConfidence(e.target.value as any)}
            className="w-full rounded-lg border border-border bg-base px-3 py-2 text-sm text-textPrimary outline-none transition-colors focus:border-fire"
          >
            <option value="both">Nominal + Alta</option>
            <option value="nominal">Solo Nominal</option>
            <option value="high">Solo Alta</option>
          </select>
        </div>

        {/* Filtro Brillo mínimo */}
        <div className="min-w-32">
          <label className="mb-1 block font-mono text-xs uppercase tracking-wide text-textSecondary">
            Brillo Mínimo
          </label>
          <div className="relative flex items-center">
            <input
              type="number"
              min="0"
              max="500"
              step="10"
              value={minBrightness || ""}
              onChange={(e) => setMinBrightness(Number(e.target.value) || 0)}
              placeholder="0"
              className="w-full rounded-lg border border-border bg-base pl-3 pr-8 py-2 text-sm text-textPrimary outline-none transition-colors focus:border-fire font-mono"
            />
            <span className="absolute right-3 font-mono text-xs text-textSecondary pointer-events-none">
              K
            </span>
          </div>
        </div>

        {(filterProvince || filterStatus !== "ACTIVE" || filterConfidence !== "both" || minBrightness > 0) ? (
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilterProvince("");
                setStatus("ACTIVE");
                setFilterConfidence("both");
                setMinBrightness(0);
              }}
              className="rounded-lg border border-border px-3 py-2 text-xs text-textSecondary transition-colors hover:text-fire"
            >
              Limpiar filtros
            </button>
          </div>
        ) : null}
      </div>

      {/* Stats */}
      {!loading && filteredFires.length > 0 ? (
        <div className="mb-6 grid grid-cols-3 gap-4">
          {[
            ["Total focos", filteredFires.length],
            ["Alta confianza", filteredFires.filter((f) => f.confidence === "high").length],
            [
              "Brillo medio",
              totalBrightness > 0 ? `${totalBrightness.toFixed(1)} K` : "—",
            ],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-xl border border-border bg-surface p-4 text-center"
            >
              <div className="font-mono text-2xl font-bold text-fire">{value}</div>
              <div className="mt-1 text-xs text-textSecondary sm:text-sm">{label}</div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Tabla */}
      {loading ? (
        <div className="py-24 text-center font-mono text-sm text-textSecondary">
          Cargando datos...
        </div>
      ) : filteredFires.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface py-20 text-center">
          <div className="mb-2 text-3xl">🔍</div>
          <div className="text-sm text-textSecondary">
            Sin resultados para los filtros seleccionados.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFires.map((fire) => {
            const frpBadge = getFrpBadge(fire.brightness);
            const isOpen = expanded === fire.fire_id;
            return (
              <div
                key={fire.fire_id}
                className="overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-border/80"
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : fire.fire_id)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left"
                >
                  <span
                    className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                      fire.confidence === "high"
                        ? "bg-fire"
                        : fire.confidence === "nominal"
                          ? "bg-amber"
                          : "bg-textSecondary"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold capitalize text-textPrimary">
                        {(fire.province ?? "—").replace(/-/g, " ")}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 font-mono text-xs ${frpBadge.color}`}
                      >
                        {fire.brightness.toFixed(0)} K
                      </span>
                    </div>
                    <div className="mt-1 font-mono text-xs text-textSecondary">
                      {fire.latitude.toFixed(3)}, {fire.longitude.toFixed(3)} ·{" "}
                      {fire.acq_date} {fire.acq_time} UTC
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-3">
                    <span
                      className={`font-mono text-xs ${
                        CONF_COLOR[fire.confidence] ?? "text-textSecondary"
                      }`}
                    >
                      {CONF_LABEL[fire.confidence] ?? fire.confidence}
                    </span>
                    <span className="text-xs text-textSecondary">
                      {isOpen ? "▲" : "▼"}
                    </span>
                  </div>
                </button>

                {isOpen ? (
                  <div className="animate-fade-in space-y-5 border-t border-border bg-base/50 px-5 py-5">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                      {[
                        ["ID", fire.fire_id],
                        ["Brillo", `${fire.brightness.toFixed(1)} K`],
                        ["Satélite", fire.satellite],
                        ["Estado", filterStatus],
                        ["Fuente", "NASA FIRMS NRT"],
                      ].map(([label, value]) => (
                            <div key={String(label)}>
                              <div className="mb-0.5 text-xs text-textSecondary">
                                {label}
                              </div>
                              <div className="break-all font-mono text-xs text-textPrimary">
                                {String(value)}
                              </div>
                            </div>
                          ))}
                    </div>
                    <a
                      href={`https://www.google.com/maps?q=${fire.latitude},${fire.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-mono text-xs text-fire hover:underline"
                    >
                      🗺️ Ver en Google Maps
                    </a>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
