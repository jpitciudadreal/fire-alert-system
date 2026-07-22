"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import TabMap       from "@/components/tabs/TabMap";
import TabSubscribe from "@/components/tabs/TabSubscribe";
import TabMyAlerts  from "@/components/tabs/TabMyAlerts";
import TabHistory   from "@/components/tabs/TabHistory";
import TabFAQ       from "@/components/tabs/TabFAQ";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Landing tabbed — réplica de `fire-alert-web/app/page.tsx`.
 *
 * Composición:
 *   - Header sticky con brand 🔥 + logo institucional del Gobierno
 *     + indicador live del estado de FIRMS.
 *   - Nav con 5 pestañas (Mapa en vivo · Suscribirse* · Mis alertas* ·
 *     Historial · ¿Cómo funciona?).
 *     * Solo visibles / activas para usuarios autenticados.
 *   - Footer sobrio con aviso de emergencias 112 y atribución FIRMS.
 *
 * Detalle de altura:
 *   - `main` usa `overflow-hidden` (no `auto`) para que los hijos sean
 *     quienes controlen el scroll. Así TabMap puede llenar TODO el alto
 *     disponible sin que el contenedor padre le imponga scroll propio.
 *     El scroll final queda en el `<aside>` ("Focos activos").
 */

const ALL_TABS = [
  { id: "map",       label: "🗺️  Mapa en vivo",      protected: false },
  { id: "subscribe", label: "🔔  Suscribirse",         protected: true  },
  { id: "my-alerts", label: "📋  Mis alertas",         protected: true  },
  { id: "history",   label: "📜  Historial",           protected: false },
  { id: "faq",       label: "❓  ¿Cómo funciona?",    protected: false },
] as const;

type Tab = (typeof ALL_TABS)[number]["id"];

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("map");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    // Comprobación inicial de sesión
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthenticated(!!data.session);
      setUserEmail(data.session?.user?.email ?? null);
    });

    // Escuchar cambios de autenticación en tiempo real
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      setUserEmail(session?.user?.email ?? null);
      // Si el usuario cierra sesión y está en una pestaña protegida, redirigir al mapa
      if (!session && (activeTab === "subscribe" || activeTab === "my-alerts")) {
        setActiveTab("map");
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabClick = (tab: Tab, isProtected: boolean) => {
    if (isProtected && !isAuthenticated) {
      // Si no está autenticado y la pestaña es protegida, redirigir a la cuenta
      return;
    }
    setActiveTab(tab);
  };

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
              Alertas Incendios <span className="text-fire">JPIT</span>
            </div>
          </div>
        </div>

        {/* Logo institucional */}
        <div className="flex justify-center">
          <Image
            src="/logo-jpit.jpg"
            alt="Jefatura Provincial de Inspección de las Telecomunicaciones — Ministerio para la Transición Digital y de la Función Pública"
            width={320}
            height={80}
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
          {userEmail && (
            <span className="hidden font-mono text-xs text-textPrimary md:inline ml-2">
              {userEmail}
            </span>
          )}
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
        {ALL_TABS.map((tab) => {
          const locked = tab.protected && !isAuthenticated;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id, tab.protected)}
              disabled={locked ?? false}
              title={
                locked
                  ? "Inicia sesión con tu cuenta @digital.gob.es para acceder"
                  : undefined
              }
              className={`group relative whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "tab-active"
                  : locked
                  ? "cursor-not-allowed text-textSecondary/30"
                  : "text-textSecondary hover:text-textPrimary"
              }`}
            >
              {tab.label}
              {locked ? (
                <span className="ml-1.5 text-[10px] text-textSecondary/40">
                  🔒
                </span>
              ) : null}
            </button>
          );
        })}
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
        {activeTab === "subscribe" && isAuthenticated ? <TabSubscribe /> : null}
        {activeTab === "my-alerts" && isAuthenticated ? <TabMyAlerts /> : null}
        {activeTab === "history" ? <TabHistory /> : null}
        {activeTab === "faq" ? <TabFAQ /> : null}

        {/* Mensaje de login para pestañas protegidas cuando no hay sesión */}
        {(activeTab === "subscribe" || activeTab === "my-alerts") &&
          !isAuthenticated && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center animate-fade-in">
              <div className="text-4xl">🔒</div>
              <h2 className="text-lg font-bold text-textPrimary">
                Acceso restringido
              </h2>
              <p className="max-w-sm text-sm text-textSecondary">
                Esta sección está disponible únicamente para usuarios con cuenta
                institucional{" "}
                <strong className="text-textPrimary">@digital.gob.es</strong>.
              </p>
              <Link
                href="/dashboard"
                className="mt-2 inline-flex h-10 items-center gap-2 rounded-xl bg-fire px-5 text-sm font-semibold text-white transition-colors hover:bg-fire/80"
              >
                Iniciar sesión →
              </Link>
            </div>
          )}
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
