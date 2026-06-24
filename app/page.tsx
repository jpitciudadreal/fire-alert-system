import Link from "next/link";
import { getFires } from "@/lib/firms/client";
import { isSupabaseConfigured } from "@/types";
import MapShell from "@/components/map/MapShell";
import { Card, CardHeader } from "@/components/ui/Card";
import { FireList } from "@/components/FireList";
import { FireStats } from "@/components/FireStats";
import { AlertBanner } from "@/components/AlertBanner";
import { FlameGlyph } from "@/components/icons/FlameGlyph";
import { PartnerLogo } from "@/components/brand/PartnerLogo";

export const revalidate = 3600;

export default async function HomePage() {
  const response = await getFires();
  const { fires, fetchedAt, count, isMock, source, reason } = response;
  const high = fires.filter((f) => f.confidence === "high").length;
  const nominal = fires.filter((f) => f.confidence === "nominal").length;
  const low = fires.filter((f) => f.confidence === "low").length;
  const supabaseReady = isSupabaseConfigured();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <Header supabaseReady={supabaseReady} dataIsMock={isMock} />

      {!supabaseReady ? (
        <AlertBanner tone="warn" title="Modo demo local">
          Para guardar suscripciones y enviar alertas, configura Supabase en{" "}
          <code className="rounded bg-black/50 px-1 py-0.5 font-mono text-xs">
            .env.local
          </code>{" "}
          y crea las tablas del esquema en{" "}
          <code className="rounded bg-black/50 px-1 py-0.5 font-mono text-xs">
            supabase/schema.sql
          </code>
          . Mientras tanto, la app funciona con datos FIRMS simulados.
        </AlertBanner>
      ) : reason === "invalid-key" ? (
        <AlertBanner tone="danger" title="API de FIRMS rechaza tu MAP_KEY">
          NASA devuelve 401/403 con la clave guardada en{" "}
          <code className="font-mono text-xs">.env.local</code>. Normalmente
          la clave tarda 15-30 min en activarse tras el registro; si persiste
          más de 1 hora, vuelve a generarla en{" "}
          <a
            href="https://firms.modaps.eosdis.nasa.gov/api/map_key/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-red-100"
          >
            firms.modaps.eosdis.nasa.gov/api/map_key/
          </a>
          . Mientras tanto se muestran datos demo.
        </AlertBanner>
      ) : isMock ? (
        <AlertBanner tone="info" title="Datos de demostración">
          NASA FIRMS no responde o no hay clave configurada — mostrando el
          conjunto de datos de respaldo.
        </AlertBanner>
      ) : count === 0 ? (
        <AlertBanner tone="info" title="0 focos en las últimas 24 h">
          La API de FIRMS responde correctamente con tu MAP_KEY, pero no hay
          fuegos activos detectados en este momento. Esto puede ser normal en
          temporadas de bajo riesgo. Si esperas fuegos activos y persiste más de 24 h,
          confirma que la MAP_KEY está completamente activada (NASA tarda
          15-30 min tras emitirla).
        </AlertBanner>
      ) : null}

      <div className="grid min-w-0 flex-1 gap-6 lg:grid-cols-[1fr_360px]">
        <section className="order-1 flex min-w-0 flex-col gap-6">
          <MapShell fires={fires} height={620} />
          <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <span
                    className="inline-flex h-2 w-2 animate-pulse rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.7)]"
                    aria-hidden="true"
                  />
                  Focos activos · ahora
                </span>
              }
              subtitle={`Fuente: ${source === "nasa-firms" ? "NASA FIRMS" : "Dataset demo"}`}
            />
            <FireStats
              total={count}
              highConfidence={high}
              nominalConfidence={nominal}
              lowConfidence={low}
              fetchedAt={fetchedAt}
              isMock={isMock}
            />
            <div className="mt-6 flex flex-col gap-2">
              <Link
                href="/dashboard"
                className="block w-full rounded-xl bg-gradient-to-br from-orange-500 to-red-600 px-5 py-3 text-center text-sm font-medium text-white shadow-lg shadow-orange-900/30 transition hover:from-orange-400 hover:to-red-500"
              >
                Gestionar suscripciones
              </Link>
              <Link
                href="/login"
                className="block w-full rounded-xl border border-zinc-700 bg-zinc-900/60 px-5 py-3 text-center text-sm font-medium text-zinc-200 transition hover:bg-zinc-800/60"
              >
                Iniciar sesión
              </Link>
            </div>
          </Card>
        </section>

        <aside className="order-2 flex min-w-0 flex-col">
          <Card>
            <CardHeader
              title="Últimos focos"
              subtitle="Los más recientes detectados en España"
              action={
                <Link
                  href="/dashboard"
                  className="text-xs font-medium text-orange-300 hover:text-orange-200"
                >
                  Suscribirme →
                </Link>
              }
            />
            <FireList fires={fires} limit={8} />
          </Card>
        </aside>
      </div>

      <Footer />
    </main>
  );
}

function Header({
  supabaseReady,
  dataIsMock,
}: {
  supabaseReady: boolean;
  dataIsMock: boolean;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-4">
        <PartnerLogo variant="header" />
        <div className="flex items-center gap-3">
          <FlameGlyph className="h-9 w-9 text-orange-500" />
          <div>
            <h1 className="text-lg font-semibold text-zinc-50 sm:text-xl">
              Fire Alert
            </h1>
            <p className="text-xs text-zinc-400 sm:text-sm">
              Incendios activos y alertas personalizadas por provincia
            </p>
          </div>
        </div>
      </div>

      <nav className="flex flex-wrap items-center gap-2">
        <span className="hidden text-xs text-zinc-500 sm:inline">
          VIIRS · NASA FIRMS
        </span>
        <StatusPill label="Supabase" tone={supabaseReady ? "live" : "muted"} />
        <StatusPill label="NASA FIRMS" tone={dataIsMock ? "muted" : "live"} />
      </nav>
    </header>
  );
}

/**
 * Institutional partner logo.
 *
 * Now lives in `components/brand/PartnerLogo.tsx`. This page uses the
 * `header` variant next to the Fire Alert wordmark.
 */
function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "live" | "muted";
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
        "text-[11px] font-medium uppercase tracking-wider ring-1",
        tone === "live"
          ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
          : "bg-zinc-700/40 text-zinc-300 ring-zinc-600/40",
      ].join(" ")}
    >
      <span
        className={[
          "h-1.5 w-1.5 rounded-full",
          tone === "live" ? "bg-emerald-400 animate-pulse" : "bg-zinc-400",
        ].join(" ")}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

function Footer() {
  return (
    <footer className="mt-2 flex flex-col items-start justify-between gap-2 border-t border-white/5 pt-4 text-xs text-zinc-500 sm:flex-row sm:items-center">
      <div>
        © NASA FIRMS · © OpenStreetMap · © CARTO
      </div>
      <div className="text-zinc-600">v0.1 · Wildfire Alert System</div>
    </footer>
  );
}
