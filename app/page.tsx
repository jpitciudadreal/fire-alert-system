"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import TabMap       from "@/components/tabs/TabMap";
import TabSubscribe from "@/components/tabs/TabSubscribe";
import TabMyAlerts  from "@/components/tabs/TabMyAlerts";
import TabHistory   from "@/components/tabs/TabHistory";

/**
 * Landing tabbed — réplica de `fire-alert-web/app/page.tsx`.
 *
 * Composición:
 *   - Header sticky con brand 🔥 + logo institucional del Gobierno
 *     + indicador live del estado de FIRMS.
 *   - Nav con 4 pestañas (Mapa en vivo · Suscribirse · Mis alertas ·
 *     Historial). El cambio de pestaña es client-side (useState).
 *   - Footer sobrio con aviso de emergencias 112 y atribución FIRMS.
 *
 * Detalle de altura:
 *   - `main` usa `overflow-hidden` (no `auto`) para que los hijos sean
 *     quienes controlen el scroll. Así TabMap puede llenar TODO el alto
 *     disponible sin que el contenedor padre le imponga scroll propio.
 *     El scroll final queda en el `<aside>` ("Focos activos").
 */

const TABS = [
  { id: "map",       label: "🗺️  Mapa en vivo" },
  { id: "subscribe", label: "🔔  Suscribirse" },
  { id: "my-alerts", label: "📋  Mis alertas" },
  { id: "history",   label: "📜  Historial" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("map");

  // h-[100dvh] fuerza altura DEFINITIVA del viewport (no crece con
  // contenido, no depende de la resolución de % en cadena). Evita el
  // modo bug de `min-h-screen` + flex-grow donde los hijos con
  // `height: %` colapsan a `auto` cuando los padres deben su altura
  // a flex-grow.
  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-base">
      {/* Header */}
      <header className="sticky top-0 z-50 grid grid-cols-3 items-center gap-4 border-b border-border bg-surface px-4 py-3">
        {/* Brand */}
        <div className="flex items-center gap-3 justify-self-start">
          <span className="animate-pulse-fire text-2xl">🔥</span>
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-textSecondary">
              Sistema de monitorización
            </div>
            <div className="text-lg font-bold leading-tight text-textPrimary">
              Fire Alert <span className="text-fire">España</span>
            </div>
          </div>
        </div>

        {/* Logo institucional */}
        <div className="flex justify-center">
          <Image
            src="/LogotipoGob-MTDFP_JPIT.jpg"
            alt="Gobierno de España — Ministerio para la Transición Digital y de la Función Pública"
            width={256}
            height={64}
            className="h-16 w-auto max-w-full select-none"
            draggable={false}
            priority
          />
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 justify-self-end">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-green-400" />
          <span className="hidden font-mono text-xs text-textSecondary sm:inline">
            NASA FIRMS · VIIRS NRT
          </span>
          <Link
            href="/dashboard"
            className="ml-3 rounded-lg border border-border px-2.5 py-1 text-xs text-textSecondary transition-colors hover:border-fire hover:text-fire"
          >
            Mi cuenta
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <nav className="flex gap-1 overflow-x-auto border-b border-border bg-surface px-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "tab-active"
                : "text-textSecondary hover:text-textPrimary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Contenido. `flex flex-col` es CRÍTICO: sin que `<main>` sea un
          contenedor flex, los hijos con `flex-1` no pueden crecer en él.
          La cadena anterior `<div min-h-screen flex-col>` → `<main flex-1>`
          daba a <main> una altura COMPUTADA vía flex-grow, pero los
          descendientes con `h-full` (= height: 100%) NO resuelven contra
          una altura computada (sólo contra altura explícita) — el
          navegador las trata como `auto`, propagando 0px hasta
          `.leaflet-container`. Con `flex flex-col` aquí + `flex-1` en
          TabMap el chain usa flex-grow sin ambigüedad y Leaflet recibe
          altura definitiva. */}
      {/* `relative` + `min-h-0`: aporta un contexto de posicionamiento
          para que el wrapper absoluto del mapa (interior) pueda usar
          `absolute inset-0` con tamaño resoluto. `min-h-0` rompe el
          shrink-to-content de flex (default min-height: auto colapsa). */}
      <main className="relative flex flex-1 min-h-0 flex-col overflow-hidden">
        {activeTab === "map" ? (
          <TabMap onShowHistory={() => setActiveTab("history")} />
        ) : null}
        {activeTab === "subscribe" ? <TabSubscribe /> : null}
        {activeTab === "my-alerts" ? <TabMyAlerts /> : null}
        {activeTab === "history" ? <TabHistory /> : null}
      </main>

      {/* Footer */}
      <footer className="flex items-center justify-between border-t border-border bg-surface px-4 py-2">
        <span className="font-mono text-xs text-textSecondary">
          Datos: NASA FIRMS / VIIRS S-NPP NRT · actualización cada ~3h
        </span>
        <span className="text-xs text-textSecondary">
          Emergencias: <span className="font-bold text-fire">112</span>
        </span>
      </footer>
    </div>
  );
}
