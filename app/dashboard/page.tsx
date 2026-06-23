import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, type Subscription } from "@/types";
import { PROVINCES } from "@/lib/data/provinces";
import { Card, CardHeader } from "@/components/ui/Card";
import { AlertBanner } from "@/components/AlertBanner";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { SignOutButton } from "@/components/dashboard/SignOutButton";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabaseReady = isSupabaseConfigured();

  if (!supabaseReady) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <Header email={null} showSignOut={false} />

        <AlertBanner tone="warn" title="Supabase no configurado">
          El dashboard necesita que vincules Supabase para guardar suscripciones
          y enviarte alertas. Edita{" "}
          <code className="rounded bg-black/50 px-1 py-0.5 font-mono text-xs">
            .env.local
          </code>{" "}
          con <code>NEXT_PUBLIC_SUPABASE_URL</code> y{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, y luego ejecuta el SQL de{" "}
          <code className="rounded bg-black/50 px-1 py-0.5 font-mono text-xs">
            supabase/schema.sql
          </code>
          .
        </AlertBanner>

        <Card>
          <CardHeader
            title="Aún no puedes suscribirte"
            subtitle="Pero el mapa en vivo sigue funcionando"
            action={
              <Link
                href="/"
                className="text-xs font-medium text-orange-300 hover:text-orange-200"
              >
                ← Volver al mapa
              </Link>
            }
          />
          <p className="text-sm text-zinc-300">
            Cuando configures Supabase podrás iniciar sesión y elegir las
            provincias sobre las que quieres recibir alertas por email.
          </p>
        </Card>
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

  // Fetch existing subscriptions; RLS keeps this scoped to the current user.
  type SubscriptionRow = {
    id: string;
    user_id: string;
    province_slug: string;
    province_name: string;
    email: string;
    created_at: string;
  };

  const { data: rows } = await supabase
    .from("subscriptions")
    .select("id, user_id, province_slug, province_name, email, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const subscriptions: Subscription[] = ((rows ?? []) as SubscriptionRow[]).map(
    (r) => ({
      id: r.id,
      user_id: r.user_id,
      province_slug: r.province_slug,
      province_name: r.province_name,
      email: r.email,
      created_at: r.created_at,
    })
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <Header email={user.email ?? null} showSignOut={true} />

      <DashboardClient
        userEmail={user.email ?? ""}
        userId={user.id}
        existingSubscriptions={subscriptions}
        provinces={PROVINCES}
      />
    </main>
  );
}

function Header({
  email,
  showSignOut,
}: {
  email: string | null;
  showSignOut: boolean;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-zinc-800/60"
        >
          ← Mapa
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-zinc-50 sm:text-xl">
            Mis suscripciones
          </h1>
          {email ? (
            <p className="text-xs text-zinc-400 sm:text-sm">
              Conectado como <span className="font-mono">{email}</span>
            </p>
          ) : null}
        </div>
      </div>
      {showSignOut ? <SignOutButton /> : null}
    </header>
  );
}
