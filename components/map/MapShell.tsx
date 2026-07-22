import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { FireMapProps, FireMapHeight, FireMapView } from "./FireMap";

/**
 * Client wrapper que difiere la carga del mapa Leaflet hasta que el
 * browser está disponible. Necesario porque Leaflet accede a `window`
 * en su module-load y de otra forma crashearía el SSR.
 *
 * El skeleton de carga también respeta el modo `height` (numérico o
 * `fill`) para que la transición al mapa real no provoque saltos de
 * altura visibles.
 */
const FireMap: ComponentType<FireMapProps> = dynamic(
  () => import("./FireMap"),
  {
    ssr: false,
    loading: () => <MapShellSkeleton />,
  }
);

export default function MapShell(props: FireMapProps) {
  return <FireMap {...props} />;
}

function MapShellSkeleton() {
  // Renderiza un placeholder con la MISMA forma visual que el mapa real
  // (borde + radius + fondo oscuro + spinner central). Usamos
  // `absolute inset-0` (no `h-full w-full`) para que ocupe exactamente
  // el mismo rectángulo que el mapa real cuando cargue — sin saltos
  // de layout en la transición.
  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-white/10 bg-zinc-950 text-zinc-500">
      <div className="flex items-center gap-3">
        <span className="h-3 w-3 animate-pulse rounded-full bg-orange-500" />
        Cargando mapa de focos activos…
      </div>
    </div>
  );
}

// Re-exports públicos
export type { FireMapProps, FireMapHeight, FireMapView };
