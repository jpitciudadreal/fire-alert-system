"use client";

import { useState } from "react";
import { useToast } from "@/components/Providers";
import type { Province } from "@/lib/provinces";

interface DashboardSubscription {
  id: string;
  email: string;
  province_slug: string;
  province_name: string;
  created_at: string;
}

interface SubscriptionFormProps {
  userEmail: string;
  provinces: Province[];
  existing: DashboardSubscription[];
  onCreated: (sub: DashboardSubscription) => void;
}

/**
 * SubscriptionForm — formulario simple (provincia + email implícito del
 * usuario). El POST va a `/api/subscribe` para mantener consistencia con
 * la pestaña Suscribirse de la landing.
 */
export function SubscriptionForm({
  userEmail,
  provinces,
  existing,
  onCreated,
}: SubscriptionFormProps) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [provinceSlug, setProvinceSlug] = useState("");

  const available = provinces.filter(
    (p) => !existing.some((e) => e.province_slug === p.slug)
  );

  const submit = async () => {
    if (!provinceSlug) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          province_id: provinceSlug,
        }),
      });
      const data = (await res.json()) as
        | {
            ok: true;
            subscription: DashboardSubscription;
            already_active: boolean;
          }
        | { error: string };

      if (!res.ok || "error" in data) {
        toast.push(
          "error" in data ? data.error : "Error al suscribirse",
          "error"
        );
        return;
      }

      onCreated({
        id: data.subscription.id,
        email: data.subscription.email,
        province_slug: data.subscription.province_slug,
        province_name: data.subscription.province_name,
        created_at: data.subscription.created_at ?? new Date().toISOString(),
      });

      toast.push(
        data.already_active
          ? `Ya estabas suscrito a ${data.subscription.province_name}`
          : `Suscrito a ${data.subscription.province_name}`,
        "success"
      );
      setProvinceSlug("");
    } catch (e) {
      toast.push(e instanceof Error ? e.message : "Error de red", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-3">
      <div className="flex-1 space-y-1">
        <label
          htmlFor="province_slug"
          className="block font-mono text-xs uppercase tracking-wide text-textSecondary"
        >
          Añadir provincia
        </label>
        <select
          id="province_slug"
          value={provinceSlug}
          onChange={(e) => setProvinceSlug(e.target.value)}
          disabled={available.length === 0}
          className="block w-full appearance-none rounded-xl border border-border bg-base px-3.5 py-2.5 pr-9 text-sm text-textPrimary outline-none transition-colors focus:border-fire disabled:opacity-50"
          style={{
            backgroundImage:
              "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%238B9DC3%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%226 9 12 15 18 9%22/></svg>')",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 12px center",
            backgroundSize: "12px 12px",
          }}
        >
          {available.length === 0 ? (
            <option value="">— Ya estás suscrito a todas las disponibles —</option>
          ) : (
            <>
              <option value="" disabled>
                Selecciona una provincia…
              </option>
              {available.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </>
          )}
        </select>
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={!provinceSlug || submitting}
        className="inline-flex h-10 items-center justify-center rounded-xl bg-fire px-4 text-sm font-semibold text-textPrimary transition-colors hover:bg-fire/80 disabled:cursor-not-allowed disabled:opacity-60 sm:self-end"
      >
        {submitting ? "Suscribiendo..." : "Suscribirme"}
      </button>
    </div>
  );
}
