import Link from "next/link";
import type { ReactNode } from "react";
import { FlameGlyph } from "@/components/icons/FlameGlyph";
import { PartnerLogo } from "@/components/brand/PartnerLogo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* Decorative gradient backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(234,88,12,0.18),_transparent_60%),radial-gradient(ellipse_at_bottom,_rgba(220,38,38,0.18),_transparent_60%)] bg-zinc-950"
      />

      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-4">
          {/* Institutional partner logo */}
          <PartnerLogo variant="auth" />
          {/* App wordmark, returns to home */}
          <Link
            href="/"
            className="flex items-center gap-2 text-zinc-400 transition hover:text-zinc-100"
          >
            <FlameGlyph className="h-4 w-4 text-orange-400" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">
              Fire Alert
            </span>
          </Link>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          {children}
        </div>

        <p className="mt-6 text-center text-xs text-zinc-500">
          Datos de incendios © NASA FIRMS · Diseñado para uso civil
        </p>
      </div>
    </main>
  );
}
