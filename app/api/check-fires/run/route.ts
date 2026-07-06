import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * POST /api/check-fires/run
 *
 * Ejecuta manualmente la Edge Function `check-fires` para que un usuario
 * autenticado pueda probar el flujo de alertas desde el dashboard sin
 * esperar al siguiente tick del cron (`pg_cron` corre cada 15 min).
 *
 * ¿Por qué un proxy server-side en lugar de un fetch directo desde el
 * cliente?
 *   1. La Edge Function rechaza peticiones sin `Authorization: Bearer
 *      <CRON_SECRET>` — y el secreto NO puede llegar al bundle JS del
 *      navegador (filtraría `CRON_SECRET` en el código fuente).
 *   2. La URL de Supabase es pública (`NEXT_PUBLIC_SUPABASE_URL`), así
 *      que se puede construir acá sin riesgo; sólo el Bearer necesita
 *      quedarse en server.
 *
 * El proxy:
 *   - Verifica sesión Supabase del usuario (`auth.getUser()`),
 *   - Construye `${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/check-fires`,
 *   - Inyecta `Authorization: Bearer ${CRON_SECRET}`,
 *   - Aplica un timeout interno de 25 s para no superar el límite de
 *     Vercel (60 s Hobby / 300 s Pro) y devolver un error limpio al UI,
 *   - Devuelve el `AlertRunSummary` JSON de la función tal cual.
 */
export async function POST(): Promise<Response> {
  // 1) AuthN: solo usuarios autenticados pueden ejecutar el detector.
  //    El propio `/dashboard` ya redirige a /login si no hay sesión,
  //    pero lo verificamos otra vez acá por defensa en profundidad y
  //    para no exponer la Edge Function a llamadores anónimos.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json(
      { error: "Necesitas iniciar sesión para ejecutar el detector." },
      { status: 401 }
    );
  }

  // 2) Construir la URL pública de la función. La URL es pública (es
  //    la del proyecto Supabase), así que es seguro leerla en server y
  //    derivarla en cada request — la única pieza secreta es el Bearer.
  const rawBase = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const baseUrl = rawBase.replace(/\/+$/, "");
  if (!baseUrl) {
    return Response.json(
      {
        error:
          "NEXT_PUBLIC_SUPABASE_URL no está configurado en el servidor.",
      },
      { status: 503 }
    );
  }
  const fnUrl = `${baseUrl}/functions/v1/check-fires`;

  // 3) CRON_SECRET tiene que vivir aquí (sin prefijo NEXT_PUBLIC_), si
  //    no se filtraría al cliente. En prod iría en Vercel env vars o
  //    en el `.env` del deploy.
  const cronSecret = process.env.CRON_SECRET?.trim() ?? "";
  if (!cronSecret) {
    return Response.json(
      {
        error:
          "Falta CRON_SECRET en el servidor. Añade `CRON_SECRET=<el-mismo-que-supabase-secrets>` a tu `.env` (sin NEXT_PUBLIC_) y reinicia.",
      },
      { status: 503 }
    );
  }

  // 4) Invocar la Edge Function con timeout interno. 25 s es suficiente
  //    para <100 suscriptores en SMTP Gmail y deja margen bajo el
  //    límite de Vercel; si la función se cuelga o SMTP está lento,
  //    devolvemos un 502 con mensaje accionable en vez de dejar al UI
  //    esperando.
  const REQUEST_TIMEOUT_MS = 25_000;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(fnUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cronSecret}`,
      },
      body: "{}",
      signal: ctrl.signal,
      cache: "no-store",
    });
  } catch (err) {
    clearTimeout(timer);
    const isAbort =
      err instanceof Error && err.name === "AbortError";
    const detail = isAbort
      ? `La Edge Function tardó más de ${Math.round(REQUEST_TIMEOUT_MS / 1000)} s y fue abortada.`
      : err instanceof Error
        ? err.message
        : String(err);
    return Response.json(
      {
        error: isAbort
          ? detail
          : `No se pudo contactar la Edge Function: ${detail}`,
      },
      { status: 502 }
    );
  }
  clearTimeout(timer);

  // 5) La Edge Function responde 200 incluso cuando hay errores internos
  //    (ver `jsonResponse` en supabase/functions/check-fires/index.ts).
  //    Un status no-200 indica que falló antes de componer el summary
  //    —surfacing raw.
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return Response.json(
      {
        error: `Edge Function devolvió ${res.status}: ${
          text.slice(0, 200) || "(sin cuerpo)"
        }`,
      },
      { status: 502 }
    );
  }

  let summary: AlertRunSummary;
  try {
    const body = (await res.json()) as Partial<AlertRunSummary>;
    summary = normalizeSummary(body);
  } catch {
    return Response.json(
      { error: "La Edge Function devolvió una respuesta que no es JSON." },
      { status: 502 }
    );
  }

  return Response.json({ ok: true, summary });
}

/* -------------------------------------------------------------------------- */
/*                                Types                                       */
/* -------------------------------------------------------------------------- */

/**
 * Forma exacta del JSON que devuelve check-fires. Mantenida en lockstep
 * con `AlertRunSummary` en supabase/functions/check-fires/index.ts.
 *
 * No se importa desde ahí porque Deno y Node usan module graphs
 * distintos — el compilado TS lo trataría como `unknown` y perderíamos
 * tipado sin valor añadido.
 */
interface AlertRunSummary {
  run_id: string;
  ok: boolean;
  partial: boolean;
  fetched_fires: number;
  fires_in_spain: number;
  fires_with_province: number;
  candidate_subscriptions: number;
  emails_sent: number;
  emails_skipped_idempotent: number;
  errors: { subscription?: string; stage: string; message: string }[];
  ran_at: string;
  duration_ms: number;
}

/**
 * Default-fill cualquier campo ausente por si la función evoluciona y
 * añade (o elimina) campos sin actualizar este cliente. Nunca lanzamos
 * un 500 al dashboard por una propiedad faltante — la UI degradea
 * mostrando los números que sí llegaron.
 */
function normalizeSummary(
  raw: Partial<AlertRunSummary> | null | undefined
): AlertRunSummary {
  const r = raw ?? {};
  return {
    run_id: typeof r.run_id === "string" ? r.run_id : `proxy-${Date.now()}`,
    ok: Boolean(r.ok),
    partial: Boolean(r.partial),
    fetched_fires: n(r.fetched_fires),
    fires_in_spain: n(r.fires_in_spain),
    fires_with_province: n(r.fires_with_province),
    candidate_subscriptions: n(r.candidate_subscriptions),
    emails_sent: n(r.emails_sent),
    emails_skipped_idempotent: n(r.emails_skipped_idempotent),
    errors: Array.isArray(r.errors) ? r.errors : [],
    ran_at: typeof r.ran_at === "string" ? r.ran_at : new Date().toISOString(),
    duration_ms: n(r.duration_ms),
  };
}

function n(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}
