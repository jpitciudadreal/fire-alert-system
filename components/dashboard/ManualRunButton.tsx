"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { useToast } from "@/components/Providers";

/* -------------------------------------------------------------------------- */
/*                                Types                                       */
/* -------------------------------------------------------------------------- */

/** Mirror de `AlertRunSummary` (server route) — sincronizado a mano. */
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

type RunState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "ok"; summary: AlertRunSummary }
  | { status: "error"; message: string };

type StatusTone = "ok" | "warn" | "err";
type StatTone = "fire" | "amber" | "live" | "muted";

/* -------------------------------------------------------------------------- */
/*                              Component                                     */
/* -------------------------------------------------------------------------- */

const COOLDOWN_MS = 10_000;

/**
 * ManualRunButton — sustituye al banner ámbar "Próximamente" del
 * dashboard con un botón que ejecuta `check-fires` al vuelo para
 * probar el flujo end-to-end (FIRMS → DB → Gmail SMTP).
 *
 * El proxy server-side `/api/check-fires/run` valida sesión Supabase y
 * reenvía la llamada con `Authorization: Bearer ${CRON_SECRET}`, así
 * el secreto nunca llega al bundle del cliente. La función es
 * idempotente: aunque se dispare varias veces en un minuto,
 * `(subscription_id, fire_id)` deduplica vía `alert_history` y sólo
 * sale un email si hay fuegos realmente nuevos.
 *
 * Cooldown de COOLDOWN_MS tras una ejecución OK para evitar spam
 * accidental (los suscriptores NO reciben emails duplicados, pero
 * FIRMS sufriría rate limiting si se reusa el botón en bucle).
 */
export function ManualRunButton() {
  const toast = useToast();
  const [state, setState] = useState<RunState>({ status: "idle" });

  // Cooldown vive en boolean + setTimeout con id tracked en ref.
  // Previo bug: `Date.now() < cooldownUntil` se evaluaba en render y
  // nunca había un setTimeout que disparase re-render → el botón se
  // quedaba deshabilitado para siempre tras la primera ejecución OK.
  const [inCooldown, setInCooldown] = useState(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cancela el cooldown pendiente si el componente se desmonta a
  // mitad (navegación a otra pestaña, sign-out, etc.).
  useEffect(
    () => () => {
      if (cooldownTimerRef.current !== null) {
        clearTimeout(cooldownTimerRef.current);
      }
    },
    []
  );

  const isRunning = state.status === "running";
  const disabled = isRunning || inCooldown;

  const run = useCallback(async () => {
    if (disabled) return;
    setState({ status: "running" });

    try {
      const res = await fetch("/api/check-fires/run", { method: "POST" });
      const data = (await res.json()) as
        | { ok: true; summary: AlertRunSummary }
        | { error: string };

      if (!res.ok || "error" in data) {
        const message =
          "error" in data
            ? data.error
            : `Error ${res.status} al contactar el detector.`;
        setState({ status: "error", message });
        toast.push(message, "error");
        return;
      }

      const s = data.summary;
      setState({ status: "ok", summary: s });
      const headline = s.ok
        ? s.partial
          ? `Ejecución parcial: ${s.emails_sent} email${s.emails_sent === 1 ? "" : "s"} enviado${s.emails_sent === 1 ? "" : "s"}, ${s.errors.length} error${s.errors.length === 1 ? "" : "es"}.`
          : s.emails_sent === 0 && s.fires_with_province === 0
            ? "Ejecución OK. No hay fuegos nuevos en este momento."
            : `Ejecución OK. ${s.emails_sent} email${s.emails_sent === 1 ? "" : "s"} enviado${s.emails_sent === 1 ? "" : "s"}.`
        : `Ejecución con errores (${s.errors.length}).`;
      toast.push(headline, s.ok ? (s.partial ? "info" : "success") : "error");

      // Inicia cooldown — siempre cancelamos el timer previo para que
      // ejecuciones rápidas no acumulen timers Zombi (aunque el
      // `disabled` debería evitarlo, defends in depth).
      setInCooldown(true);
      if (cooldownTimerRef.current !== null) {
        clearTimeout(cooldownTimerRef.current);
      }
      cooldownTimerRef.current = setTimeout(() => {
        cooldownTimerRef.current = null;
        setInCooldown(false);
      }, COOLDOWN_MS);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error de red.";
      setState({ status: "error", message });
      toast.push(message, "error");
    }
  }, [disabled, toast]);

  return (
    <Card>
      <CardHeader
        title="Ejecutar detector de prueba"
        subtitle="Lanza la Edge Function check-fires manualmente para ver el flujo end-to-end (FIRMS → DB → Gmail SMTP)."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={run}
          disabled={disabled}
          aria-busy={isRunning}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-fire px-5 text-sm font-semibold text-textPrimary transition-colors hover:bg-fire/80 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRunning ? (
            <>
              <span
                aria-hidden="true"
                className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
              />
              Ejecutando…
            </>
          ) : inCooldown ? (
            <>⏱ Cooldown…</>
          ) : (
            <>🔥 Ejecutar check-fires</>
          )}
        </button>
        <p className="text-xs text-textSecondary">
          Idempotente: si no hay fuegos nuevos para tus suscripciones no
          se envía ningún email. Cooldown {COOLDOWN_MS / 1000} s tras cada
          ejecución.
        </p>
      </div>

      {state.status === "ok" ? <ResultPanel summary={state.summary} /> : null}
      {state.status === "error" ? <ErrorPanel message={state.message} /> : null}
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Sub-components                                */
/* -------------------------------------------------------------------------- */

function ResultPanel({ summary }: { summary: AlertRunSummary }) {
  const tone: StatusTone = summary.ok
    ? summary.partial
      ? "warn"
      : "ok"
    : "err";

  return (
    <div className="animate-fade-in mt-5 space-y-4">
      {/* Header con badge de estado */}
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge tone={tone} />
        <span className="font-mono text-xs text-textSecondary">
          run_id:{" "}
          <span className="select-all text-textPrimary">{summary.run_id}</span>
        </span>
        <span className="font-mono text-xs text-textSecondary">
          · {summary.duration_ms} ms ·{" "}
          {new Date(summary.ran_at).toLocaleTimeString("es-ES")}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Focos detectados"
          value={summary.fetched_fires}
          tone={summary.fetched_fires > 0 ? "fire" : "muted"}
        />
        <Stat
          label="En España"
          value={summary.fires_in_spain}
          tone={summary.fires_in_spain > 0 ? "amber" : "muted"}
        />
        <Stat
          label="Con provincia"
          value={summary.fires_with_province}
          tone={summary.fires_with_province > 0 ? "fire" : "muted"}
        />
        <Stat
          label="Emails enviados"
          value={summary.emails_sent}
          tone={summary.emails_sent > 0 ? "live" : "muted"}
          suffix={
            summary.emails_skipped_idempotent > 0
              ? ` (${summary.emails_skipped_idempotent} ya alertados)`
              : undefined
          }
        />
      </div>

      {/* Help text según el estado */}
      <p className="text-xs text-textSecondary">
        {summary.fires_with_province === 0
          ? "NASA FIRMS no detectó focos en provincias con suscriptores activos en las últimas 24 h."
          : summary.emails_sent === 0
            ? `Se detectaron ${summary.fires_with_province} foco(s) con provincia pero ningún suscriptor nuevo recibió email (todos ya estaban alertados o no hay suscriptores activos en esas provincias).`
            : `${summary.emails_sent} suscriptor${summary.emails_sent === 1 ? "" : "es"} recibieron un digest por email.`}
      </p>

      {/* Subscriptions candidatas */}
      {summary.candidate_subscriptions > 0 ? (
        <p className="font-mono text-xs text-textSecondary">
          Suscripciones evaluadas: {summary.candidate_subscriptions}
        </p>
      ) : null}

      {/* Errores (si los hay) */}
      {summary.errors.length > 0 ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/5 p-4 text-xs">
          <div className="mb-2 font-semibold text-red-400">
            {summary.errors.length} error
            {summary.errors.length === 1 ? "" : "es"} durante la ejecución
          </div>
          <ul className="space-y-1.5 font-mono text-textSecondary">
            {summary.errors.slice(0, 5).map((err, i) => (
              <li key={i} className="break-words">
                <span className="text-red-400">[{err.stage}]</span>{" "}
                {err.subscription ? (
                  <span className="text-textSecondary/70">
                    sub={err.subscription.slice(0, 8)}…
                  </span>
                ) : null}{" "}
                {err.message}
              </li>
            ))}
            {summary.errors.length > 5 ? (
              <li className="text-textSecondary/70">
                +{summary.errors.length - 5} más…
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="animate-fade-in mt-5 rounded-xl border border-red-400/30 bg-red-400/5 px-4 py-3 text-sm text-red-400"
    >
      <strong className="font-semibold">No se pudo ejecutar el detector.</strong>
      <p className="mt-1 text-xs leading-relaxed">{message}</p>
    </div>
  );
}

function StatusBadge({ tone }: { tone: StatusTone }) {
  const map: Record<StatusTone, { label: string; cls: string }> = {
    ok: {
      label: "✅ OK",
      cls: "bg-green-400/15 text-green-400 ring-1 ring-green-400/30",
    },
    warn: {
      label: "⚠ Parcial",
      cls: "bg-amber/15 text-amber ring-1 ring-amber/30",
    },
    err: {
      label: "✗ Con errores",
      cls: "bg-red-400/15 text-red-400 ring-1 ring-red-400/30",
    },
  };
  const cfg = map[tone];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}

function Stat({
  label,
  value,
  tone,
  suffix,
}: {
  label: string;
  value: number;
  tone: StatTone;
  suffix?: string;
}) {
  const toneCls: Record<StatTone, string> = {
    fire: "text-fire",
    amber: "text-amber",
    live: "text-green-400",
    muted: "text-textPrimary",
  };
  return (
    <div className="rounded-xl border border-border bg-base/60 p-3 text-center">
      <div
        className={`font-mono text-xl font-bold sm:text-2xl ${toneCls[tone]}`}
      >
        {value}
        {suffix ? (
          <span className="ml-1 text-[10px] font-normal text-textSecondary">
            {suffix}
          </span>
        ) : null}
      </div>
      <div className="mt-1 text-xs text-textSecondary">{label}</div>
    </div>
  );
}
