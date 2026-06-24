import Link from "next/link";
import type { ReactNode } from "react";
import { FlameGlyph } from "@/components/icons/FlameGlyph";
import { PartnerLogo } from "@/components/brand/PartnerLogo";

/**
 * Layout para /login y /register.
 *
 * Réplica del estilo "fire-alert-web" — fondo casi-negro `bg-base` con
 * un gradiente radial `fire → transparent` que evoca la pestaña
 * "Suscribirse" de la landing. Cards `bg-surface` con borde sutil.
 */

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(255,69,0,0.16),_transparent_60%),radial-gradient(ellipse_at_bottom,_rgba(245,166,35,0.10),_transparent_60%)] bg-base"
      />

      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-4">
          <PartnerLogo variant="auth" />
          <Link
            href="/"
            className="flex items-center gap-2 text-textSecondary transition hover:text-textPrimary"
          >
            <FlameGlyph className="h-4 w-4 text-fire" />
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.2em]">
              Fire Alert
            </span>
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-2xl shadow-black/40 sm:p-8">
          {children}
        </div>

        <p className="mt-6 text-center font-mono text-xs text-textSecondary">
          Datos de incendios © NASA FIRMS · Diseñado para uso civil
        </p>
      </div>
    </main>
  );
}
