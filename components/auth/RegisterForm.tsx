"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSupabase, useToast } from "@/components/Providers";
import { Field, Input } from "@/components/ui/Field";
import { registerSchema, type RegisterInput } from "@/types";
import { isSupabaseConfigured } from "@/types";

/**
 * RegisterForm — misma lógica que la versión anterior, ahora con tema
 * dark fire (botón `bg-fire`, inputs `bg-base`).
 */
export function RegisterForm() {
  const router = useRouter();
  const supabase = useSupabase();
  const toast = useToast();
  const supabaseReady = isSupabaseConfigured();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", fullName: "" },
  });

  const onSubmit = async (data: RegisterInput) => {
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: data.fullName
        ? { data: { full_name: data.fullName } }
        : undefined,
    });
    if (error) {
      toast.push(error.message || "Error al registrarse", "error");
      return;
    }
    toast.push(
      "Cuenta creada. Revisa tu correo si es necesario confirmar.",
      "success"
    );
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="rounded-xl border border-fire/30 bg-fire/5 px-4 py-3 text-xs text-textSecondary">
        ⚠️ <strong>Acceso restringido:</strong> Solo se permite el registro de cuentas de correo institucionales bajo el dominio <strong className="text-fire">@digital.gob.es</strong>.
      </div>

      {!supabaseReady ? (
        <div className="border-amber/30 bg-amber/5 text-amber rounded-xl border px-4 py-3 text-sm">
          Supabase no está configurado en este entorno. El registro no
          persistirá hasta que configures las claves en{" "}
          <code className="font-mono text-xs">.env.local</code>.
        </div>
      ) : null}

      <Field
        label="Nombre (opcional)"
        htmlFor="fullName"
        error={errors.fullName}
        hint="Solo lo usaremos para personalizar tus alertas."
      >
        <Input
          id="fullName"
          type="text"
          autoComplete="name"
          placeholder="Cómo quieres que te llamemos"
          invalid={Boolean(errors.fullName)}
          {...register("fullName")}
        />
      </Field>

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

      <Field
        label="Contraseña"
        htmlFor="password"
        error={errors.password}
        hint="Mínimo 6 caracteres."
      >
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          invalid={Boolean(errors.password)}
          {...register("password")}
        />
      </Field>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-fire px-4 text-sm font-semibold text-textPrimary transition-colors hover:bg-fire/80 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Creando..." : "Crear cuenta"}
      </button>
    </form>
  );
}
