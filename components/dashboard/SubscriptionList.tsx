"use client";

import { useState } from "react";
import { useSupabase, useToast } from "@/components/Providers";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Subscription } from "@/types";

interface SubscriptionListProps {
  subscriptions: Subscription[];
  onRemoved: (id: string) => void;
}

export function SubscriptionList({
  subscriptions,
  onRemoved,
}: SubscriptionListProps) {
  const supabase = useSupabase();
  const toast = useToast();
  const [removing, setRemoving] = useState<string | null>(null);

  if (subscriptions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
        <p className="text-sm text-zinc-400">
          Aún no tienes suscripciones. Selecciona una provincia arriba para
          empezar a recibir alertas.
        </p>
      </div>
    );
  }

  async function remove(id: string, name: string) {
    setRemoving(id);
    const { error } = await supabase
      .from("subscriptions")
      .delete()
      .eq("id", id)
      .select();
    setRemoving(null);
    if (error) {
      toast.push(error.message, "error");
      return;
    }
    onRemoved(id);
    toast.push(`Eliminado: ${name}`, "info");
  }

  return (
    <ul className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]">
      {subscriptions.map((sub) => (
        <li
          key={sub.id}
          className="flex flex-col items-start justify-between gap-3 px-4 py-4 sm:flex-row sm:items-center"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge tone="live">Activa</Badge>
              <h3 className="text-sm font-semibold text-zinc-50">
                {sub.province_name}
              </h3>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {sub.email} · creada el{" "}
              {new Date(sub.created_at).toLocaleDateString("es-ES")}
            </p>
          </div>

          <Button
            type="button"
            variant="danger"
            size="sm"
            loading={removing === sub.id}
            onClick={() => remove(sub.id, sub.province_name)}
          >
            Eliminar
          </Button>
        </li>
      ))}
    </ul>
  );
}
