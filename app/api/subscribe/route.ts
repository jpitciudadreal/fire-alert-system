import {
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { getProvince } from "@/lib/provinces";
import { makeToken, verifyToken } from "@/lib/unsubscribe-token";
import type { Subscription } from "@/types";

/**
 * /api/subscribe — replica del endpoint de fire-alert-web, ahora contra
 * Supabase.
 *
 *   GET    ?email=…                          → lista suscripciones del email
 *   POST   { email, province_id }            → crea (o recupera) suscripción
 *   DELETE ?token=…&email=…&province_slug=…  → baja por magic-link (HMAC)
 *
 * El listado se hace siempre por email (no requiere login). El POST
 * tampoco requiere login — al igual que en fire-alert-web, los usuarios
 * pueden suscribirse anónimamente y recibir el magic-link por email
 * (en esta versión sin envío de email real, el token aparece en la
 * respuesta para que la UI lo muestre en pantalla / lo envíe a la
 * página `/unsubscribe` correspondiente).
 */

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const email = url.searchParams.get("email")?.trim().toLowerCase();
  if (!email) {
    return Response.json(
      { error: "Falta el parámetro `email`." },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  // Si Supabase no está configurado, mock-client devuelve { data: [], error }.
  const { data, error } = await sb
    .from("subscriptions")
    .select("*")
    .eq("email", email)
    .order("created_at", { ascending: true });

  if (error && !String(error.message ?? "").includes("mock")) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ subscriptions: data ?? [] });
}

export async function POST(request: Request): Promise<Response> {
  let body: { email?: string; province_id?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body no es JSON válido." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const provinceSlug = body.province_id?.trim().toLowerCase();
  if (!email || !provinceSlug) {
    return Response.json(
      { error: "Faltan `email` y/o `province_id`." },
      { status: 400 }
    );
  }

  const province = getProvince(provinceSlug);
  if (!province) {
    return Response.json(
      { error: `Provincia desconocida: ${provinceSlug}` },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  // Idempotente: si ya existe (email, province_slug) lo devolvemos en
  // lugar de error 409 (más amable que la versión original de
  // fire-alert-web, que devolvía error en ese caso).
  const { data: existing } = await sb
    .from("subscriptions")
    .select("*")
    .eq("email", email)
    .eq("province_slug", provinceSlug)
    .maybeSingle();

  if (existing) {
    return Response.json({
      ok: true,
      subscription: existing as Subscription,
      already_active: true,
    });
  }

  // Si tenemos un usuario autenticado (caso Dashboard), le atamos la
  // suscripción a su user_id. Si no, queda como anónima.
  let userId: string | null = null;
  try {
    const { data: user } = await sb.auth.getUser();
    userId = user?.user?.id ?? null;
  } catch {
    userId = null;
  }

  // Calculamos el unsubscribe_token server-side como HMAC determinista
  // de (email|province_slug) — mismo mecanismo que `verifyToken` validará
  // en el DELETE. Esto evita el bug anterior donde la DB generaba bytes
  // aleatorios y el verify esperaba un HMAC → unsubscribe nunca coincidía.
  const unsubscribeToken = await makeToken(email, provinceSlug);

  const row = {
    email,
    province_slug: provinceSlug,
    province_name: province.name,
    user_id: userId,
    confirmed: true,
    unsubscribe_token: unsubscribeToken,
  };
  const { data, error } = await sb
    .from("subscriptions")
    .insert([row])
    .select()
    .single();

  if (error) {
    const msg = String(error.message ?? "");
    // En modo mock el cliente devuelve errores «Operación no soportada».
    // En ese caso simulamos la inserción en memoria para que la UI
    // pueda probarse offline.
    if (msg.includes("mock")) {
      const fakeId = `mock-${Date.now()}`;
      return Response.json({
        ok: true,
        subscription: {
          id: fakeId,
          email,
          province_slug: provinceSlug,
          province_name: province.name,
          user_id: userId,
          confirmed: true,
          created_at: new Date().toISOString(),
          unsubscribe_token: unsubscribeToken,
        } as Subscription & { unsubscribe_token: string },
        already_active: false,
        mock: true,
      });
    }
    // Race: dos POSTs concurrentes con la misma (email, province_slug)
    // pueden saltarse el `maybeSingle` arriba y chocar en el INSERT.
    // Postgres devuelve 23505 unique_violation. Resolvemos re-leyendo
    // y marcando la fila como ya activa en lugar de propagar el 500.
    if (/23505|unique[_ ]violation|duplicate key/i.test(msg)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sbRace = supabase as any;
      const { data: raced } = await sbRace
        .from("subscriptions")
        .select("*")
        .eq("email", email)
        .eq("province_slug", provinceSlug)
        .maybeSingle();
      if (raced) {
        return Response.json({
          ok: true,
          subscription: raced as Subscription,
          already_active: true,
        });
      }
      return Response.json(
        { error: "Ya estás suscrito a esta provincia." },
        { status: 409 }
      );
    }
    return Response.json({ error: msg }, { status: 500 });
  }

  return Response.json({
    ok: true,
    subscription: data as Subscription & { unsubscribe_token?: string },
    already_active: false,
  });
}

export async function DELETE(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const email = url.searchParams.get("email")?.trim().toLowerCase() ?? "";
  const provinceSlug = url.searchParams.get("province_id")?.trim().toLowerCase() ?? "";

  if (!token || !email || !provinceSlug) {
    return Response.json(
      { error: "Faltan `token`, `email` y/o `province_id`." },
      { status: 400 }
    );
  }

  const ok = await verifyToken(token, email, provinceSlug);
  if (!ok) {
    return Response.json({ error: "Token inválido." }, { status: 403 });
  }

  // HMAC verified → safe to use the privileged service-role client.
  // The public DELETE policy on `subscriptions` is closed (`using(false)`)
  // to prevent anon-key enumeration of UUIDs, so the regular anon-key
  // client would be rejected. Service-role bypasses RLS, which is fine
  // because we already enforced ownership via the HMAC signature here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = createSupabaseServiceRoleClient() as any;
  const { error } = await sb
    .from("subscriptions")
    .delete()
    .eq("email", email)
    .eq("province_slug", provinceSlug);

  if (error && !String(error.message ?? "").includes("mock")) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
