"use client";

import * as React from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { FirePoint } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { formatAcqTime } from "@/lib/firms/client";

/**
 * Altura del wrapper del mapa.
 * - `number` (ej. `600`) → altura fija en píxeles (compat legacy).
 * - `"fill"`              → ocupa el 100 % del alto disponible (h-full).
 *
 * El modo `fill` requiere que el contenedor padre tenga una altura
 * resuelta (flex-1, h-screen, etc.). En la landing tabbed se usa con
 * un `main` `flex-1 overflow-hidden` para que el mapa ocupe el resto
 * del viewport menos header/tabs/footer.
 */
export type FireMapHeight = number | "fill";

/**
 * Capas base que el usuario puede alternar desde la UI del tab.
 * - `dark`      → CartoDB dark (mapas políticos tinted dark). Default.
 * - `satellite` → Esri World Imagery (ortofotos). Útil para cotejar
 *                 la localización exacta de un foco contra el terreno.
 *
 * `dark` y `satellite` son mutuamente excluyentes — se renderiza
 * UNA sola `<TileLayer>` por `<MapContainer>`. Cambiar el `view`
 * desmonta la TileLayer vieja y monta la nueva; Leaflet no recrea
 * el resto del state del mapa (zoom, position, markers) gracias a
 * que la instancia del mapa persiste entre renders.
 */
export type FireMapView = "dark" | "satellite" | "streets" | "relief";

export interface FireMapProps {
  fires: FirePoint[];
  height?: FireMapHeight;
  initialCenter?: [number, number];
  initialZoom?: number;
  view?: FireMapView;
}

const SPAIN_CENTER: [number, number] = [39.8, -3.5];

const BASE_LAYERS: Record<
  FireMapView,
  { url: string; attribution: string; maxZoom: number }
> = {
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      'Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 19,
  },
  streets: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  relief: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution:
      'Kartendaten: &copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Kartendarstellung: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
    maxZoom: 17,
  },
};

function confidenceTone(confidence: string): "high" | "nominal" | "low" {
  if (confidence === "high") return "high";
  if (confidence === "low") return "low";
  return "nominal";
}

function confidenceColor(tone: "high" | "nominal" | "low"): string {
  switch (tone) {
    case "high":
      return "#ef4444";
    case "nominal":
      return "#f97316";
    case "low":
      return "#facc15";
  }
}

/**
 * Sincroniza el tamaño del canvas Leaflet con el tamaño real del
 * contenedor tras la hidratación y en cada resize del mismo. Es la
 * solución canónica al bug clásico de Leaflet dentro de layouts que
 * cambian de tamaño vía flex-grow o layout shifts: Leaflet cachea las
 * dimensiones del contenedor en su mount con `getBoundingClientRect`
 * y si ese instante ocurre antes de que flex termine su distribución,
 * captura 0 y el mapa queda muerto aunque el contenedor crezca después.
 *
 * `invalidateSize()` fuerza a Leaflet a releer el tamaño real del
 * contenedor y a re-renderizar. `ResizeObserver` cubre el caso
 * resize-driven (cambio de pestaña, rotación, viewport dinámico).
 */
function MapResizer() {
  const map = useMap();

  React.useEffect(() => {
    // Primer flush post-hidratación — captura el tamaño real una vez
    // que flex-grow ya haya corrido.
    map.invalidateSize();

    // Y en cada cambio de tamaño del contenedor mientras el mapa viva.
    const container = map.getContainer();
    if (!container) return;

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const observer = new ResizeObserver(() => {
      // Debounce 50ms — Leaflet re-renderiza entero y queremos
      // evitar storms si el navegador dispara varios eventos seguidos.
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => map.invalidateSize(), 50);
    });
    observer.observe(container);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [map]);

  return null;
}

/**
 * Renderer Leaflet real. Se importa dinámicamente con `ssr: false`
 * desde `MapShell.tsx` para evitar el crash `window is not defined`
 * durante el render del servidor (Leaflet accede a `window` al cargar
 * el módulo).
 */
export default function FireMap({
  fires,
  height = 560,
  initialCenter = SPAIN_CENTER,
  initialZoom = 6,
  view = "satellite",
}: FireMapProps) {
  // Combina el modo `fill` con altura numérica legacy sin que el caller
  // tenga que duplicar lógica.
  //
  //   - Modo número (`560`): wrapper con `style={{ height: 560 }}`,
  //     ignora el chain flex del padre.
  //   - Modo `fill`: wrapper con `absolute inset-0` para posicionarlo
  //     contra el padre `relative`. Esto escapa de los problemas del
  //     chain flex anidado (`main` flex-1 → TabMap root flex-col →
  //     map zone flex-1 → MapShell flex-item → wrapper h-full) que
  //     en algunos casos resuelven a `height: 0` si algún nodo pierde
  //     la altura definida. Con absolute el browser resuelve contra
  //     el contenedor relativo sin ambigüedad.
  const fillMode = height === "fill";
  const wrapperStyle: React.CSSProperties | undefined = fillMode
    ? undefined
    : { height };
  const wrapperClass = fillMode
    ? "absolute inset-0 overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/40"
    : "relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/40";
  const baseLayer = BASE_LAYERS[view];

  return (
    <div className={wrapperClass} style={wrapperStyle}>
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        scrollWheelZoom
        className="absolute inset-0 z-0 bg-zinc-950"
        style={{ background: "#09090b" }}
      >
        <MapResizer />
        <TileLayer
          attribution={baseLayer.attribution}
          url={baseLayer.url}
          maxZoom={baseLayer.maxZoom}
        />

        {fires.map((fire) => {
          const tone = confidenceTone(fire.confidence);
          const color = confidenceColor(tone);
          return (
            <CircleMarker
              key={fire.fire_id}
              center={[fire.latitude, fire.longitude]}
              radius={tone === "high" ? 9 : tone === "nominal" ? 7 : 5}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.55,
                weight: tone === "high" ? 2.5 : 1.8,
              }}
            >
              <Popup>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge tone={tone}>{fire.confidence}</Badge>
                    <span className="text-xs text-zinc-500">
                      {fire.satellite.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div>
                    <strong>Coordenadas:</strong> {fire.latitude.toFixed(4)},{" "}
                    {fire.longitude.toFixed(4)}
                  </div>
                  <div>
                    <strong>Fecha:</strong> {fire.acq_date} ·{" "}
                    {formatAcqTime(fire.acq_time)} UTC
                  </div>
                  <div>
                    <strong>Intensidad:</strong> {fire.brightness.toFixed(1)} K
                  </div>
                  {fire.province ? (
                    <div>
                      <strong>Provincia:</strong>{" "}
                      {fire.province.toLocaleUpperCase()}
                    </div>
                  ) : null}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <Legend />
    </div>
  );
}

function Legend() {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] flex flex-col gap-1 rounded-xl border border-white/10 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-300 backdrop-blur">
      <span className="font-semibold text-zinc-100">Confianza</span>
      <div className="flex items-center gap-2">
        <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
        Alta
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block h-3 w-3 rounded-full bg-orange-500" />
        Nominal
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block h-3 w-3 rounded-full bg-yellow-400" />
        Baja
      </div>
    </div>
  );
}
