import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { verifyToken } from "@/lib/unsubscribe-token";

/**
 * GET /api/confirm-subscription?token=…&email=…&province_id=…
 *
 * Confirma una suscripción tras el clic en el enlace de double opt-in.
 * Verifica el mismo HMAC que se usa para el flujo de baja (token derivado
 * de (email, province_slug) con la clave HMAC_SECRET). Si el token es
 * válido, actualiza `confirmed = true` en la fila correspondiente.
 *
 * Responde con una página HTML mínima (redirect visual) en lugar de JSON
 * para que el usuario que abre el enlace desde el email reciba feedback
 * inmediato sin necesidad de lógica cliente adicional.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const email = url.searchParams.get("email")?.trim().toLowerCase() ?? "";
  const provinceSlug =
    url.searchParams.get("province_id")?.trim().toLowerCase() ?? "";

  // ---- Validación de parámetros ----
  if (!token || !email || !provinceSlug) {
    return htmlResponse(
      "Enlace inválido",
      "El enlace de confirmación está incompleto. Por favor, vuelve a suscribirte.",
      false
    );
  }

  // ---- Verificar HMAC ----
  const tokenValid = await verifyToken(token, email, provinceSlug);
  if (!tokenValid) {
    return htmlResponse(
      "Enlace expirado o inválido",
      "El token de confirmación no es válido o ha expirado.",
      false
    );
  }

  // ---- Actualizar confirmed = true ----
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = createSupabaseServiceRoleClient() as any;
  const { data, error } = await sb
    .from("subscriptions")
    .update({ confirmed: true })
    .eq("email", email)
    .eq("province_slug", provinceSlug)
    .select()
    .maybeSingle();

  if (error && !String(error.message ?? "").includes("mock")) {
    console.error("[confirm-subscription] DB error:", error.message);
    return htmlResponse(
      "Error del servidor",
      "No se pudo confirmar la suscripción. Por favor, inténtalo de nuevo.",
      false
    );
  }

  if (!data) {
    return htmlResponse(
      "Suscripción no encontrada",
      "No encontramos ninguna suscripción pendiente de confirmación para este enlace.",
      false
    );
  }

  return htmlResponse(
    "¡Suscripción confirmada!",
    `Tu suscripción a alertas de <strong>${escapeHtml(data.province_name ?? provinceSlug)}</strong> ha sido activada correctamente. Recibirás un email cuando se detecte un foco activo en tu provincia.`,
    true
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function htmlResponse(title: string, body: string, success: boolean): Response {
  const color = success ? "#22c55e" : "#ef4444";
  const emoji = success ? "✅" : "❌";
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.FIRM_ALERTS_BASE_URL ??
    "";

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(title)} — Alertas Incendios JPIT</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0a0a0b;
      color: #ededed;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 24px;
    }
    .card {
      max-width: 480px;
      width: 100%;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 16px;
      padding: 40px 32px;
      text-align: center;
    }
    .emoji { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 22px; margin-bottom: 12px; color: ${color}; }
    p { font-size: 14px; line-height: 1.6; color: #a1a1aa; }
    .btn {
      display: inline-block;
      margin-top: 28px;
      padding: 10px 24px;
      background: #f97316;
      color: #fff;
      border-radius: 10px;
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      transition: opacity .15s;
    }
    .btn:hover { opacity: .85; }
  </style>
</head>
<body>
  <div class="card">
    <div class="emoji">${emoji}</div>
    <h1>${escapeHtml(title)}</h1>
    <p>${body}</p>
    ${appUrl ? `<a class="btn" href="${escapeHtml(appUrl)}">Volver a la aplicación</a>` : ""}
  </div>
</body>
</html>`;

  return new Response(html, {
    status: success ? 200 : 400,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
