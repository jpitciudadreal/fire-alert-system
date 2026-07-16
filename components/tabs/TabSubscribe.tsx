"use client";

import { useMemo, useState } from "react";
import { groupByComunidad, type Province } from "@/lib/provinces";

/**
 * Tab "Suscribirse" — réplica de `fire-alert-web/components/TabSubscribe.tsx`
 * adaptada a Supabase.
 *
 * Diferencias:
 *   - Usa `<select>` con `<optgroup>` por comunidad (en el subproyecto
 *     ya lo hacía así; se mantiene para paridad visual).
 *   - El POST va contra `/api/subscribe` (definido en `app/api/subscribe`).
 *   - Si la API devuelve `unsubscribe_token` y `NEXT_PUBLIC_APP_URL`,
 *     la UI ofrece al usuario el "magic link" de baja (en producción
 *     esto llegaría por email; aquí lo enseñamos en pantalla para
 *     entornos de demo).
 */

interface SuccessResponse {
  ok: true;
  subscription: {
    id: string;
    email: string;
    province_slug: string;
    province_name: string;
    unsubscribe_token?: string;
  };
  already_active?: boolean;
  mock?: boolean;
}

interface ErrorResponse {
  error: string;
}

type State = "idle" | "loading" | "ok" | "error";

export default function TabSubscribe() {
  const GROUPS = useMemo(() => groupByComunidad(), []);
  const [email, setEmail] = useState("");
  const [provinceId, setProvinceId] = useState("");
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");
  const [unsubUrl, setUnsubUrl] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email || !provinceId) return;
    setState("loading");
    setMessage("");
    setUnsubUrl(null);

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          province_id: provinceId,
        }),
      });
      const data = (await res.json()) as SuccessResponse | ErrorResponse;

      if (res.ok && "ok" in data) {
        const provinceName = data.subscription.province_name;
        setState("ok");
        setMessage(
          data.already_active
            ? `Ya estabas suscrito a ${provinceName}.`
            : `Suscripción activada para ${provinceName}. ${
                data.mock
                  ? "(modo demo — el email no se envía)"
                  : "Recibirás un email de confirmación."
              }`
        );
        // Generamos el unsubscribe_url pseudo-oficial (token → /unsubscribe)
        if (data.subscription.unsubscribe_token) {
          const base =
            (typeof window !== "undefined" ? window.location.origin : "") || "";
          const url = `${base}/unsubscribe?token=${encodeURIComponent(
            data.subscription.unsubscribe_token
          )}&email=${encodeURIComponent(
            data.subscription.email
          )}&province_id=${encodeURIComponent(
            data.subscription.province_slug
          )}`;
          setUnsubUrl(url);
        }
      } else {
        setState("error");
        setMessage("error" in data ? data.error : "Error desconocido.");
      }
    } catch (e) {
      console.error("[TabSubscribe]", e);
      setState("error");
      setMessage("Error de conexión.");
    }
  };

  return (
    <div className="mx-auto max-w-2xl animate-fade-in p-6 h-full overflow-y-auto">
      {/* Hero */}
      <div className="mb-6 rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-fire/10 text-2xl">
            🔔
          </div>
          <div>
            <h1 className="mb-1 text-xl font-bold text-textPrimary">
              Suscríbete a alertas por provincia
            </h1>
            <p className="text-sm leading-relaxed text-textSecondary">
              Cuando un satélite NASA detecte un incendio en tu provincia,
              recibirás un email al instante. Las alertas se reevalúan cada
              15 minutos (cron de Supabase).
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            ["🛰️", "Satélite detecta", "NASA VIIRS escanea España cada ~3 horas"],
            ["⚡", "Alerta inmediata", "Recibes email tras la detección"],
            ["📊", "Actualizaciones", "Cada 15 minutos mientras esté activo"],
          ].map(([icon, title, desc]) => (
            <div
              key={title}
              className="rounded-xl border border-border bg-base p-3 text-center"
            >
              <div className="mb-1 text-xl">{icon}</div>
              <div className="mb-1 text-xs font-semibold text-textPrimary">{title}</div>
              <div className="text-xs leading-snug text-textSecondary">{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Form / estado */}
      {state === "ok" ? (
        <div className="animate-fade-in rounded-2xl border border-green-400/30 bg-surface p-8 text-center">
          <div className="mb-3 text-4xl">✅</div>
          <h2 className="mb-2 text-lg font-bold text-textPrimary">
            Suscripción activada
          </h2>
          <p className="mb-4 text-sm text-textSecondary">{message}</p>
          {unsubUrl ? (
            <a
              href={unsubUrl}
              className="block break-all rounded-lg border border-border bg-base p-2 font-mono text-xs text-textSecondary hover:text-textPrimary"
            >
              URL para darte de baja: {unsubUrl}
            </a>
          ) : null}
          <button
            onClick={() => {
              setState("idle");
              setEmail("");
              setProvinceId("");
              setUnsubUrl(null);
            }}
            className="mt-6 text-sm text-fire hover:underline"
          >
            Suscribirse a otra provincia
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="mb-4 font-semibold text-textPrimary">Nueva suscripción</h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block font-mono text-xs uppercase tracking-wide text-textSecondary">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                disabled={state === "loading"}
                className="w-full rounded-lg border border-border bg-base px-4 py-3 font-mono text-sm text-textPrimary placeholder:text-textSecondary/50 outline-none transition-colors focus:border-fire"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-mono text-xs uppercase tracking-wide text-textSecondary">
                Provincia
              </label>
              <select
                value={provinceId}
                onChange={(e) => setProvinceId(e.target.value)}
                disabled={state === "loading"}
                className="w-full cursor-pointer appearance-none rounded-lg border border-border bg-base px-4 py-3 text-sm text-textPrimary outline-none transition-colors focus:border-fire"
              >
                <option value="">Selecciona una provincia…</option>
                {Object.entries(GROUPS)
                  .sort(([a], [b]) => a.localeCompare(b, "es"))
                  .map(([comunidad, provinces]) => (
                    <optgroup key={comunidad} label={comunidad}>
                      {provinces
                        .sort((a, b) => a.name.localeCompare(b.name, "es"))
                        .map((p: Province) => (
                          <option key={p.slug} value={p.slug}>
                            {p.name}
                          </option>
                        ))}
                    </optgroup>
                  ))}
              </select>
            </div>

            {state === "error" ? (
              <div className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-400">
                {message}
              </div>
            ) : null}

            <button
              onClick={handleSubmit}
              disabled={!email || !provinceId || state === "loading"}
              className="w-full rounded-lg bg-fire py-3 text-sm font-semibold text-textPrimary transition-colors hover:bg-fire/80 disabled:cursor-not-allowed disabled:bg-fire/30"
            >
              {state === "loading" ? "Activando..." : "Activar alertas"}
            </button>

            <p className="text-center text-xs text-textSecondary">
              Puedes cancelar la suscripción en cualquier momento desde el email
              de confirmación o desde la pestaña «Mis alertas».
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
