"use client";

import { useState } from "react";
import { useToast } from "@/components/Providers";

interface DashboardSubscription {
  id: string;
  email: string;
  province_slug: string;
  province_name: string;
  created_at: string;
  unsubscribe_token?: string;
  confirmed?: boolean;
}

interface SubscriptionListProps {
  subscriptions: DashboardSubscription[];
  onRemoved: (id: string) => void;
}

export function SubscriptionList({
  subscriptions,
  onRemoved,
}: SubscriptionListProps) {
  const toast = useToast();
  const [removing, setRemoving] = useState<string | null>(null);

  if (subscriptions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-base/40 p-8 text-center">
        <p className="text-sm text-textSecondary">
          Aún no tienes suscripciones. Selecciona una provincia arriba para
          empezar a recibir alertas.
        </p>
      </div>
    );
  }

  const remove = async (sub: DashboardSubscription) => {
    if (!sub.unsubscribe_token) {
      toast.push(
        "Esta suscripción no tiene token de baja — habrá que borrarla desde SQL.",
        "error"
      );
      return;
    }
    setRemoving(sub.id);
    try {
      const qs = new URLSearchParams({
        token: sub.unsubscribe_token,
        email: sub.email,
        province_id: sub.province_slug,
      });
      const res = await fetch(`/api/subscribe?${qs.toString()}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.push(data.error ?? `Error ${res.status}`, "error");
        return;
      }
      onRemoved(sub.id);
      toast.push(`Eliminado: ${sub.province_name}`, "info");
    } catch (e) {
      toast.push(e instanceof Error ? e.message : "Error de red", "error");
    } finally {
      setRemoving(null);
    }
  };

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-base/30">
      {subscriptions.map((sub) => (
        <li
          key={sub.id}
          className="flex flex-col items-start justify-between gap-3 px-4 py-4 sm:flex-row sm:items-center"
        >
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-400 ring-1 ring-green-400/30">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                Activa
              </span>
              <h3 className="text-sm font-semibold text-textPrimary">
                {sub.province_name}
              </h3>
            </div>
            <p className="font-mono text-xs text-textSecondary">
              {sub.email} ·{" "}
              {sub.created_at
                ? new Date(sub.created_at).toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "—"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => remove(sub)}
            disabled={removing === sub.id}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-textSecondary transition-colors hover:border-red-400/50 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {removing === sub.id ? "Eliminando..." : "Eliminar"}
          </button>
        </li>
      ))}
    </ul>
  );
}
