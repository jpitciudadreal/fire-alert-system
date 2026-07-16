"use client";

import { useState, useCallback } from "react";
import { getProvince } from "@/lib/provinces";
import type { FirePoint, FireResponse } from "@/types";

/**
 * Tab "Mis alertas" — réplica de `fire-alert-web/components/TabMyAlerts.tsx`.
 *
 * Conectado a Supabase via `/api/subscribe` (GET). El POST/DELETE se
 * hace desde aquí con el magic-link HMAC que el server devuelve en
 * `subscription.unsubscribe_token` (ya no hace falta regenerar en
 * cliente: el token ES el HMAC calculado server-side en el POST).
 */

interface Subscription {
  id: string;
  email: string;
  province_slug: string;
  province_name: string;
  unsubscribe_token?: string;
  confirmed?: boolean;
  created_at: string;
}

function buildUnsubUrl(sub: Subscription): string | null {
  if (!sub.unsubscribe_token) return null;
  // Construcción en navegador: window es seguro aquí porque el effect
  // se ejecuta client-side.
  if (typeof window === "undefined") return null;
  const base = window.location.origin;
  return `${base}/unsubscribe?token=${encodeURIComponent(
    sub.unsubscribe_token,
  )}&email=${encodeURIComponent(sub.email)}&province_id=${encodeURIComponent(
    sub.province_slug,
  )}`;
}

export default function TabMyAlerts() {
  const [email, setEmail] = useState("");
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [fires, setFires] = useState<FirePoint[]>([]);
  const [removing, setRemoving] = useState<string | null>(null);

  const search = useCallback(async () => {
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/subscribe?email=${encodeURIComponent(email.trim().toLowerCase())}`,
      );
      const data = (await res.json()) as { subscriptions: Subscription[] };
      const list = data.subscriptions ?? [];
      setSubs(list);
      setSearched(true);

      // Carga paralela de focos para mostrar live-status por suscripción.
      if (list.length > 0) {
        const r = await fetch("/api/fires?limit=200", { cache: "no-store" });
        const d = (await r.json()) as FireResponse;
        setFires(d.fires ?? []);
      } else {
        setFires([]);
      }
    } catch (e) {
      console.error("[TabMyAlerts]", e);
    } finally {
      setLoading(false);
    }
  }, [email]);

  const unsubscribe = async (sub: Subscription) => {
    const url = buildUnsubUrl(sub);
    if (!url) {
      console.warn("[TabMyAlerts] sin unsubscribe_token, no se puede borrar");
      return;
    }
    setRemoving(sub.province_slug);
    try {
      const u = new URL(url);
      const token = u.searchParams.get("token") ?? "";
      const emailP = u.searchParams.get("email") ?? "";
      const provinceP = u.searchParams.get("province_id") ?? "";
      const qs = new URLSearchParams({
        token,
        email: emailP,
        province_id: provinceP,
      });
      const res = await fetch(`/api/subscribe?${qs.toString()}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSubs((prev) =>
          prev.filter((s) => s.province_slug !== sub.province_slug),
        );
      }
    } finally {
      setRemoving(null);
    }
  };

  const provFiresBySlug = (slug: string): FirePoint[] =>
    fires.filter((f) => f.province === slug).slice(0, 5);

  return (
    <div className="mx-auto max-w-3xl animate-fade-in p-6 sm:p-8 h-full overflow-y-auto">
      <h1 className="mb-2 text-2xl font-bold text-textPrimary">Mis alertas</h1>
      <p className="mb-8 text-sm text-textSecondary sm:text-base">
        Introduce tu email para ver y gestionar tus suscripciones activas.
      </p>

      <div className="mb-8 rounded-2xl border border-border bg-surface p-6">
        <div className="flex gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setSearched(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="tu@email.com"
            className="flex-1 rounded-lg border border-border bg-base px-4 py-2.5 font-mono text-sm text-textPrimary placeholder:text-textSecondary/50 outline-none transition-colors focus:border-fire"
          />
          <button
            onClick={search}
            disabled={!email || loading}
            className="whitespace-nowrap rounded-lg bg-fire px-5 py-2.5 text-sm font-semibold text-textPrimary transition-colors hover:bg-fire/80 disabled:bg-fire/30"
          >
            {loading ? "..." : "Buscar"}
          </button>
        </div>
      </div>

      {searched ? (
        <div className="animate-fade-in">
          {subs.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface py-16 text-center">
              <div className="mb-2 text-3xl">📭</div>
              <div className="text-sm text-textSecondary">
                No hay suscripciones para este email.
              </div>
              <p className="mt-2 text-xs text-textSecondary">
                ¿Quieres crear una? Ve a la pestaña <strong>Suscribirse</strong>
                .
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mb-1 font-mono text-xs text-textSecondary">
                {subs.length} suscripción{subs.length !== 1 ? "es" : ""} activa
                {subs.length !== 1 ? "s" : ""}
              </div>
              {subs.map((sub) => {
                const province = getProvince(sub.province_slug);
                const provFires = provFiresBySlug(sub.province_slug);
                const hasActive = provFires.length > 0;
                const unsubUrl = buildUnsubUrl(sub);
                return (
                  <div
                    key={sub.province_slug}
                    className="overflow-hidden rounded-2xl border border-border bg-surface"
                  >
                    <div className="flex items-center justify-between border-b border-border px-6 py-5">
                      <div className="flex items-center gap-3">
                        <span
                          className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                            hasActive ? "bg-fire animate-pulse" : "bg-green-400"
                          }`}
                        />
                        <div>
                          <div className="font-semibold text-textPrimary">
                            {province?.name ??
                              sub.province_name ??
                              sub.province_slug}
                          </div>
                          <div className="font-mono text-xs text-textSecondary">
                            {province?.comunidad ?? "—"}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => unsubscribe(sub)}
                        disabled={removing === sub.province_slug || !unsubUrl}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs text-textSecondary transition-colors hover:border-red-400/50 hover:text-red-400 disabled:opacity-50"
                      >
                        {removing === sub.province_slug ? "..." : "Cancelar"}
                      </button>
                    </div>

                    <div className="space-y-4 px-6 py-5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-mono text-textSecondary">
                          Suscrito desde
                        </span>
                        <span className="font-mono text-textPrimary">
                          {new Date(sub.created_at).toLocaleDateString(
                            "es-ES",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </span>
                      </div>

                      {hasActive ? (
                        <div className="rounded-xl border border-fire/20 bg-fire/5 p-4">
                          <div className="mb-3 text-sm font-semibold text-fire">
                            🔥 {provFires.length} foco
                            {provFires.length !== 1 ? "s" : ""} activo
                            {provFires.length !== 1 ? "s" : ""}
                          </div>
                          {provFires.slice(0, 3).map((f) => (
                            <div
                              key={f.fire_id}
                              className="flex items-center justify-between border-b border-border/50 py-2 font-mono text-xs text-textSecondary last:border-0"
                            >
                              <span>
                                {f.latitude.toFixed(3)},{" "}
                                {f.longitude.toFixed(3)}
                              </span>
                              <span className="text-amber">
                                {f.brightness.toFixed(0)} K
                              </span>
                            </div>
                          ))}
                          {provFires.length > 3 ? (
                            <div className="mt-2 text-xs text-textSecondary">
                              +{provFires.length - 3} más
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-green-400">
                          <span>✅</span>
                          <span>Sin incendios activos detectados</span>
                        </div>
                      )}

                      {unsubUrl ? (
                        <a
                          href={unsubUrl}
                          className="block break-all font-mono text-xs text-textSecondary hover:text-fire"
                        >
                          🔗 {unsubUrl}
                        </a>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
