import { useState, useCallback, useEffect } from "react";
import { getProvince } from "@/lib/provinces";
import type { FirePoint, FireResponse } from "@/types";
import { useSupabase } from "@/components/Providers";

interface Subscription {
  id: string;
  email: string;
  province_slug: string;
  province_name: string;
  unsubscribe_token?: string;
  confirmed?: boolean;
  filter_confidence?: "nominal" | "high" | null;
  min_brightness?: number | null;
  min_frp?: number | null;
  created_at: string;
}

function buildUnsubUrl(sub: Subscription): string | null {
  if (!sub.unsubscribe_token) return null;
  if (typeof window === "undefined") return null;
  const base = window.location.origin;
  return `${base}/unsubscribe?token=${encodeURIComponent(
    sub.unsubscribe_token,
  )}&email=${encodeURIComponent(sub.email)}&province_id=${encodeURIComponent(
    sub.province_slug,
  )}`;
}

export default function TabMyAlerts() {
  const supabase = useSupabase();
  const [email, setEmail] = useState("");
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [fires, setFires] = useState<FirePoint[]>([]);
  const [removing, setRemoving] = useState<string | null>(null);

  const search = useCallback(async (targetEmail: string) => {
    if (!targetEmail) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/subscribe?email=${encodeURIComponent(targetEmail.trim().toLowerCase())}`,
      );
      const data = (await res.json()) as { subscriptions: Subscription[] };
      const list = data.subscriptions ?? [];
      setSubs(list);
      setSearched(true);

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
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.email) {
        setEmail(data.user.email);
        search(data.user.email);
      }
    };
    init();
  }, [supabase, search]);

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
      <p className="mb-6 text-sm text-textSecondary sm:text-base">
        Estas son tus suscripciones activas vinculadas a tu cuenta institucional <strong className="text-fire font-mono">{email}</strong>.
      </p>

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
                          Estado
                        </span>
                        <span className={`font-mono text-xs font-semibold px-2 py-0.5 rounded-full ${
                          sub.confirmed ? "bg-green-400/10 text-green-400" : "bg-yellow-400/10 text-yellow-400"
                        }`}>
                          {sub.confirmed ? "Confirmada" : "Pendiente de Confirmar"}
                        </span>
                      </div>

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

                      <div className="border-t border-border/40 my-2 pt-2">
                        <div className="text-xs text-textSecondary uppercase font-mono tracking-wider mb-2">Filtros configurados</div>
                        <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                          <div className="bg-base p-2 rounded-lg text-center">
                            <div className="text-[10px] text-textSecondary mb-0.5">Confianza</div>
                            <div className="text-textPrimary font-semibold capitalize">{sub.filter_confidence || "Cualquiera"}</div>
                          </div>
                          <div className="bg-base p-2 rounded-lg text-center">
                            <div className="text-[10px] text-textSecondary mb-0.5">Brillo Mín</div>
                            <div className="text-textPrimary font-semibold">{sub.min_brightness ? `${sub.min_brightness} K` : "—"}</div>
                          </div>
                          <div className="bg-base p-2 rounded-lg text-center">
                            <div className="text-[10px] text-textSecondary mb-0.5">FRP Mín</div>
                            <div className="text-textPrimary font-semibold">{sub.min_frp ? `${sub.min_frp} MW` : "—"}</div>
                          </div>
                        </div>
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
