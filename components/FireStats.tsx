import * as React from "react";
import type { FireResponse } from "@/types";

interface FireStatsProps {
  total: number;
  highConfidence: number;
  nominalConfidence: number;
  lowConfidence: number;
  fetchedAt: string;
  /**
   * Why the response contains no fires. Drives both the helper text
   * under the grid and the small pill on the "Baja" cell so the user
   * can tell at a glance whether the empty state is "real empty"
   * (`"empty"`) or an actionable failure mode.
   */
  reason?: FireResponse["reason"];
}

/**
 * Live fire counts. Designed to fit inside the 360px right-side panel on
 * lg viewports without overflowing its grid track.
 *
 * Failure-mode copy comes from the `reason` field on the FIRMS response:
 *   - `"empty"`       → "Sin detecciones en las últimas 24h."
 *   - `"no-key"`      → guidance to configure the NASA_FIRMS_API_KEY env.
 *   - `"invalid-key"` → tell the user the key was rejected.
 *   - `"network"`     → "No se pudo conectar con NASA FIRMS".
 *   - absent          → live firMS data; just the timestamp + brand.
 *
 * Notes on defensive layout:
 * - `min-w-0` on the grid + every Stat lets the cells shrink below their
 *   min-content width. Without this, a single wide label (e.g. "Total
 *   activos") would force CSS Grid to grow the column and push the
 *   adjacent 1fr column off-screen to the right.
 * - `truncate` on the label clips cleanly with an ellipsis if a future
 *   label ever sneaks back over the limit.
 */
export function FireStats({
  total,
  highConfidence,
  nominalConfidence,
  lowConfidence,
  fetchedAt,
  reason,
}: FireStatsProps) {
  const footerPill = REASON_FOOTER[reason ?? "ok"];
  const helperText = REASON_HELPER[reason ?? "ok"];

  return (
    <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label="Total" value={total} accent="default" />
      <Stat label="Alta" value={highConfidence} accent="high" />
      <Stat label="Nominal" value={nominalConfidence} accent="nominal" />
      <Stat label="Baja" value={lowConfidence} accent="low" footer={footerPill} />

      <div className="col-span-2 mt-1 min-w-0 text-xs text-zinc-500 sm:col-span-4">
        {helperText}
        <span className="ml-2 hidden sm:inline">
          · Última actualización:{" "}
          {new Date(fetchedAt).toLocaleString("es-ES", {
            dateStyle: "short",
            timeStyle: "short",
          })}
        </span>
      </div>
    </div>
  );
}

/** Small pill shown under the "Baja" cell — mirrors the response reason. */
const REASON_FOOTER: Record<"ok" | NonNullable<FireStatsProps["reason"]>, string> =
  {
    ok: "Tiempo real",
    empty: "Sin detección",
    "no-key": "Sin API key",
    "invalid-key": "API inválida",
    network: "Sin conexión",
  };

/** Sentence rendered in the footnote row. */
const REASON_HELPER: Record<"ok" | NonNullable<FireStatsProps["reason"]>, string> =
  {
    ok: "Datos en vivo desde NASA FIRMS.",
    empty:
      "Sin detecciones en las últimas 24h en España según NASA FIRMS.",
    "no-key":
      "Falta NASA_FIRMS_API_KEY en .env.local — añádela para ver datos en vivo.",
    "invalid-key":
      "NASA FIRMS rechazó la API key (401/403). Verifica el valor en .env.local.",
    network:
      "No se pudo conectar con NASA FIRMS. Reintenta en unos segundos.",
  };

function Stat({
  label,
  value,
  accent,
  footer,
}: {
  label: string;
  value: number;
  accent: "default" | "high" | "nominal" | "low";
  footer?: string;
}) {
  const accentClass = {
    default: "text-zinc-50",
    high: "text-red-300",
    nominal: "text-orange-300",
    low: "text-yellow-200",
  }[accent];

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
      <div className="truncate text-[11px] uppercase tracking-wider text-zinc-400">
        {label}
      </div>
      <div
        className={`mt-1 truncate text-2xl font-semibold tabular-nums ${accentClass}`}
      >
        {value}
      </div>
      {footer ? (
        <div className="truncate text-[11px] text-zinc-500">{footer}</div>
      ) : null}
    </div>
  );
}
