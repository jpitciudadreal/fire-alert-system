"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

/**
 * Página /unsubscribe — abre directamente el magic-link enviado por email
 * (o el generado on-the-fly en modo demo). Hace DELETE a
 * `/api/subscribe` con los params del query string y muestra resultado
 * al usuario.
 *
 * Réplica de `fire-alert-web/app/unsubscribe/page.tsx` adaptada a una
 * ruta App Router con `Suspense` (obligatorio para `useSearchParams`
 * en Next 16).
 */

function UnsubscribeContent() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const email = params.get("email") ?? "";
  const provinceId = params.get("province_id") ?? "";

  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!token || !email || !provinceId) {
      setState("error");
      setMessage("Faltan parámetros token/email/province_id.");
      return;
    }
    const qs = new URLSearchParams({ token, email, province_id: provinceId });
    fetch(`/api/subscribe?${qs.toString()}`, { method: "DELETE" })
      .then(async (r) => {
        const data = (await r.json().catch(() => ({}))) as { error?: string };
        if (r.ok) {
          setState("ok");
        } else {
          setState("error");
          setMessage(data.error ?? `Error ${r.status}`);
        }
      })
      .catch((err: unknown) => {
        setState("error");
        setMessage(err instanceof Error ? err.message : "Error de red");
      });
  }, [token, email, provinceId]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-base p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-10 text-center">
        <div className="mb-4 text-4xl">
          {state === "loading" ? "⏳" : state === "ok" ? "✅" : "❌"}
        </div>
        {state === "loading" ? (
          <p className="font-mono text-sm text-textSecondary">
            Procesando baja...
          </p>
        ) : null}
        {state === "ok" ? (
          <>
            <h1 className="mb-2 text-xl font-bold text-textPrimary">
              Baja procesada
            </h1>
            <p className="text-sm text-textSecondary">
              Ya no recibirás alertas de esa provincia.
            </p>
            <Link
              href="/"
              className="mt-6 inline-block text-sm text-fire hover:underline"
            >
              Volver al inicio
            </Link>
          </>
        ) : null}
        {state === "error" ? (
          <>
            <h1 className="mb-2 text-xl font-bold text-textPrimary">
              Enlace inválido
            </h1>
            <p className="text-sm text-textSecondary">{message}</p>
            <p className="mt-2 text-xs text-textSecondary">
              El enlace puede haber caducado. Usa el más reciente de tus
              emails.
            </p>
            <Link
              href="/"
              className="mt-6 inline-block text-sm text-fire hover:underline"
            >
              Volver al inicio
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense>
      <UnsubscribeContent />
    </Suspense>
  );
}
