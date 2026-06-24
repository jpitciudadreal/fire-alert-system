import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/types";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import { PartnerLogo } from "@/components/brand/PartnerLogo";
import { FlameGlyph } from "@/components/icons/FlameGlyph";

/**
 * Dashboard `/dashboard` — vista autenticada con mis suscripciones y
 * alta de nuevas provincias. Restilizado al tema dark fire (mismas
 * variables que la landing tabbed).
 *
 * Cambios respecto al estado previo:
 *   - Sustituye el `bg-zinc-950` por `bg-base` y los `border-white/10`
 *     por `border-border`, gradient `from-orange-500` por `bg-fire`.
 *   - El botón "Volver al mapa" pasa a `border-border bg-surface`.
 *   - El banner de "Supabase no configurado" usa tonos amber.
 */

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabaseReady = isSupabaseConfigured();

  if (!supabaseReady) {
    return (
      <main className="flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8 mx-auto">
        <DashboardHeader email={null} showSignOut={false} />

        <div className="rounded-xl border border-amber/30 bg-amber/5 px-4 py-3 text-sm text-amber">
          <strong className="font-semibold">Supabase no configurado.</strong> El
          dashboard necesita que vincules Supabase para guardar suscripciones
          y enviarte alertas. Edita{" "}
          <code className="font-mono text-xs">.env.local</code> con{" "}
          <code>NEXT_PUBLIC_SUPABASE_URL</code> y{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, y luego ejecuta el SQL de{" "}
          <code className="font-mono text-xs">supabase/schema.sql</code>.
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h1 className="mb-1 text-base font-semibold text-textPrimary sm:text-lg">
            Aún no puedes suscribirte
          </h1>
          <p className="mb-4 text-xs text-textSecondary sm:text-sm">
            Pero el mapa en vivo y el alta anónima (pestaña «Suscribirse»)
            siguen funcionando sin auth.
          </p>
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-fire px-4 text-sm font-semibold text-textPrimary transition-colors hover:bg-fire/80"
          >
            ← Volver al mapa
          </Link>
        </div>
      </main>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // El modelo actual de la base de datos es email-keyed (no per-user).
  // Las suscripciones del usuario se buscan por su email.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data: rows } = await sb
    .from("subscriptions")
    .select("id, email, province_slug, province_name, created_at, unsubscribe_token, confirmed")
    .eq("email", (user.email ?? "").toLowerCase())
    .order("created_at", { ascending: false });

  const subscriptions = (rows ?? []) as Array<{
    id: string;
    email: string;
    province_slug: string;
    province_name: string;
    created_at: string;
    unsubscribe_token?: string;
    confirmed?: boolean;
  }>;

  // Importamos PROVINCES dinámicamente para evitar un ciclo de imports
  // entre components/dashboard y lib/data/provinces.
  const { PROVINCES_SORTED } = await import("@/lib/provinces");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <DashboardHeader email={user.email ?? null} showSignOut={true} />

      <DashboardClient
        userEmail={user.email ?? ""}
        existingSubscriptions={subscriptions}
        provinces={PROVINCES_SORTED}
      />
    </main>
  );
}

function DashboardHeader({
  email,
  showSignOut,
}: {
  email: string | null;
  showSignOut: boolean;
}) {
  return (
    <header className="flex flex-col gap-3 border-b border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:rounded-xl sm:border">
      <div className="flex items-center gap-3">
        <PartnerLogo variant="header" />
        <div className="flex items-center gap-2">
          <FlameGlyph className="h-5 w-5 text-fire" />
          <div>
            <div className="font-mono text-[11px] uppercase tracking-widest text-textSecondary">
              Sistema de monitorización
            </div>
            <h1 className="text-base font-semibold leading-tight text-textPrimary sm:text-lg">
              Mis suscripciones
            </h1>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {email ? (
          <span className="font-mono text-xs text-textSecondary">{email}</span>
        ) : null}
        <Link
          href="/"
          className="rounded-lg border border-border px-3 py-1.5 text-xs text-textSecondary transition-colors hover:border-fire hover:text-fire"
        >
          ← Mapa
        </Link>
        {showSignOut ? <SignOutButton /> : null}
      </div>
    </header>
  );
}
