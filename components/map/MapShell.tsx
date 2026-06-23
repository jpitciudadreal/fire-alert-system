"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { FireMapProps } from "./FireMap";

/**
 * Client wrapper that defers loading of the Leaflet-based map until the
 * browser is available. Required because Leaflet accesses `window` at
 * module load time and would otherwise crash the Next.js server renderer.
 */
const FireMap: ComponentType<FireMapProps> = dynamic(
  () => import("./FireMap"),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex items-center justify-center rounded-2xl border border-white/10 bg-zinc-950 text-zinc-500"
        style={{ height: 560 }}
      >
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 animate-pulse rounded-full bg-orange-500" />
          Cargando mapa de focos activos…
        </div>
      </div>
    ),
  }
);

export default function MapShell(props: FireMapProps) {
  return <FireMap {...props} />;
}

export type { FireMapProps };
