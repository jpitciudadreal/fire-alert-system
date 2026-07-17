import {
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { getProvince } from "@/lib/provinces";
import { makeToken, verifyToken } from "@/lib/unsubscribe-token";
import type { Subscription } from "@/types";

/**
 * /api/subscribe — endpoint de suscripciones contra Supabase.
 *
 *   GET    ?email=…                          → lista suscripciones del email
 *   POST   { email, province_id,             → crea (o recupera) suscripción
 *            filter_confidence?,             →   "nominal" | "high" | null (ambas)
 *            min_brightness? }              →   número en Kelvin (ej. 340) | null
 *   DELETE ?token=…&email=…&province_slug=… → baja por magic-link (HMAC)
 *
 * Flujo de confirmación (double opt-in):
 *   - POST crea la fila con `confirmed: false`.
 *   - Se envía (en producción) un email con enlace a /api/confirm-subscription?token=…
 *   - El usuario hace clic → la fila se marca `confirmed: true`.
 *   - check-fires solo envía alertas a suscripciones con `confirmed: true`.
 *
 * Excepción: si el usuario está autenticado con una sesión válida de Supabase
 * Auth, la suscripción se confirma directamente (`confirmed: true`) sin
 * necesitar el flujo de email, dado que el dominio ya está validado.
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
  let body: {
    email?: string;
    province_id?: string;
    filter_confidence?: "nominal" | "high" | null;
    min_brightness?: number | null;
  };
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

  // Normalizar filtros opcionales
  const filterConfidence =
    body.filter_confidence === "high" || body.filter_confidence === "nominal"
      ? body.filter_confidence
      : null;
  const minBrightness =
    typeof body.min_brightness === "number" && body.min_brightness > 0
      ? body.min_brightness
      : null;

  const supabase = await createSupabaseServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  // Idempotente: si ya existe (email, province_slug) lo devolvemos.
  // Si los filtros han cambiado, actualizamos la fila existente.
  const { data: existing } = await sb
    .from("subscriptions")
    .select("*")
    .eq("email", email)
    .eq("province_slug", provinceSlug)
    .maybeSingle();

  if (existing) {
    // Si cambian los filtros, los actualizamos
    const needsUpdate =
      existing.filter_confidence !== filterConfidence ||
      existing.min_brightness !== minBrightness;
    if (needsUpdate) {
      await sb
        .from("subscriptions")
        .update({ filter_confidence: filterConfidence, min_brightness: minBrightness })
        .eq("id", existing.id);
    }
    return Response.json({
      ok: true,
      subscription: { ...existing, filter_confidence: filterConfidence, min_brightness: minBrightness },
      already_active: true,
    });
  }

  // Determinar si el usuario está autenticado → confirmar directamente
  let userId: string | null = null;
  let isAuthenticatedUser = false;
  try {
    const { data: user } = await sb.auth.getUser();
    if (user?.user?.id) {
      userId = user.user.id;
      isAuthenticatedUser = true;
    }
  } catch {
    userId = null;
  }

  // Usuarios autenticados con sesión válida: confirmar directamente
  // Usuarios anónimos: confirmed = false (requieren double opt-in por email)
  const confirmed = isAuthenticatedUser;

  const unsubscribeToken = await makeToken(email, provinceSlug);

  const row = {
    email,
    province_slug: provinceSlug,
    province_name: province.name,
    user_id: userId,
    confirmed,
    filter_confidence: filterConfidence,
    min_brightness: minBrightness,
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
          confirmed,
          filter_confidence: filterConfidence,
          min_brightness: minBrightness,
          created_at: new Date().toISOString(),
          unsubscribe_token: unsubscribeToken,
        } as Subscription & { unsubscribe_token: string },
        already_active: false,
        mock: true,
        pending_confirmation: !confirmed,
      });
    }
    // Race condition: dos POSTs concurrentes con la misma (email, province_slug)
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
    pending_confirmation: !confirmed,
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
