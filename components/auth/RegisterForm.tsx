"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSupabase, useToast } from "@/components/Providers";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { registerSchema, type RegisterInput } from "@/types";
import { isSupabaseConfigured } from "@/types";

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
      {!supabaseReady ? (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-100">
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
          placeholder="tu@correo.com"
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

      <Button type="submit" loading={isSubmitting} className="w-full">
        Crear cuenta
      </Button>
    </form>
  );
}
