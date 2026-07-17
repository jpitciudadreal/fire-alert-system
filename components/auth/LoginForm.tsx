"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useSupabase } from "@/components/Providers";
import { useToast } from "@/components/Providers";
import { Field, Input } from "@/components/ui/Field";
import { loginSchema, type LoginInput } from "@/types";
import { isSupabaseConfigured } from "@/types";

/**
 * LoginForm — mismas validaciones que la versión original, ahora con
 * inputs/buttons alineados al tema dark fire (border-base, focus-fire,
 * etc.). Mantiene la lógica de Supabase intacta.
 */
export function LoginForm() {
  const router = useRouter();
  const supabase = useSupabase();
  const toast = useToast();
  const supabaseReady = isSupabaseConfigured();
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [sendingRecovery, setSendingRecovery] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginInput) => {
    const { error } = await supabase.auth.signInWithPassword(data);
    if (error) {
      toast.push(error.message || "Error al iniciar sesión", "error");
      return;
    }
    toast.push("Sesión iniciada", "success");
    router.push("/dashboard");
    router.refresh();
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail) return;
    setSendingRecovery(true);
    
    // Obtener la base origin para redireccionar de vuelta a la app
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
      redirectTo: `${origin}/recovery`,
    });

    setSendingRecovery(false);
    if (error) {
      toast.push(error.message || "Error al enviar correo de recuperación", "error");
      return;
    }
    
    toast.push("Correo de recuperación enviado. Revisa tu bandeja de entrada.", "success");
    setIsRecoveryMode(false);
  };

  if (isRecoveryMode) {
    return (
      <form onSubmit={handleRecovery} className="space-y-5 animate-fade-in">
        <header className="space-y-1 text-center">
          <h2 className="text-lg font-semibold text-zinc-50">Recuperar contraseña</h2>
          <p className="text-xs text-textSecondary">
            Introduce tu email y te enviaremos un enlace para restablecer tu contraseña.
          </p>
        </header>

        <Field label="Email" htmlFor="recovery-email">
          <Input
            id="recovery-email"
            type="email"
            placeholder="tu@digital.gob.es"
            value={recoveryEmail}
            onChange={(e) => setRecoveryEmail(e.target.value)}
            required
          />
        </Field>

        <div className="flex flex-col gap-2">
          <button
            type="submit"
            disabled={sendingRecovery}
            className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-fire px-4 text-sm font-semibold text-textPrimary transition-colors hover:bg-fire/80 disabled:opacity-60"
          >
            {sendingRecovery ? "Enviando..." : "Enviar enlace"}
          </button>
          <button
            type="button"
            onClick={() => setIsRecoveryMode(false)}
            className="text-xs text-textSecondary hover:text-textPrimary"
          >
            Volver al inicio de sesión
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {!supabaseReady ? (
        <div className="rounded-xl border border-amber/30 bg-amber/5 px-4 py-3 text-sm text-amber">
          Supabase no está configurado. Añade las claves en{" "}
          <code className="font-mono text-xs">.env.local</code> y crea las
          tablas de <code className="font-mono text-xs">supabase/schema.sql</code>{" "}
          para poder iniciar sesión.
        </div>
      ) : null}

      <Field label="Email" htmlFor="email" error={errors.email}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="tu@digital.gob.es"
          invalid={Boolean(errors.email)}
          {...register("email")}
        />
      </Field>

      <Field label="Contraseña" htmlFor="password" error={errors.password}>
        <div className="relative">
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="•••••••••"
            invalid={Boolean(errors.password)}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setIsRecoveryMode(true)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-orange-300 hover:text-orange-200"
          >
            ¿Has olvidado la contraseña?
          </button>
        </div>
      </Field>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-fire px-4 text-sm font-semibold text-textPrimary transition-colors hover:bg-fire/80 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Iniciando..." : "Iniciar sesión"}
      </button>
    </form>
  );
}
