"use client";

import * as React from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  Tooltip,
} from "react-leaflet";
import type { FirePoint } from "@/types";
import { Badge } from "@/components/ui/Badge";

export interface FireMapProps {
  fires: FirePoint[];
  height?: number;
  initialCenter?: [number, number];
  initialZoom?: number;
}

const SPAIN_CENTER: [number, number] = [39.8, -3.5];

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
 * Actual leaflet renderer. Imported dynamically with `ssr: false` from a
 * client wrapper to avoid the `window is not defined` SSR crash
 * (Leaflet accesses `window` at module import time).
 */
export default function FireMap({
  fires,
  height = 560,
  initialCenter = SPAIN_CENTER,
  initialZoom = 6,
}: FireMapProps) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/40"
      style={{ height }}
    >
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        scrollWheelZoom
        className="h-full w-full bg-zinc-950"
        style={{ background: "#09090b" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
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
              <Tooltip direction="top" offset={[0, -6]} opacity={1}>
                <div className="space-y-1 text-xs">
                  <div className="font-semibold text-zinc-900">
                    {tone === "high" ? "🔥 Alta confianza" : "Foco activo"}
                  </div>
                  <div className="text-zinc-700">
                    {fire.latitude.toFixed(3)}, {fire.longitude.toFixed(3)}
                  </div>
                  <div className="text-zinc-600">
                    {fire.acq_date} · {fire.acq_time.slice(0, 2)}:
                    {fire.acq_time.slice(2)} UTC
                  </div>
                  <div className="text-zinc-600">
                    Brillo: {fire.brightness.toFixed(1)} K
                  </div>
                </div>
              </Tooltip>
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
                    <strong>Fecha:</strong> {fire.acq_date} · {fire.acq_time}
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
