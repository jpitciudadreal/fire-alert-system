"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useSupabase } from "@/components/Providers";
import { useToast } from "@/components/Providers";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { loginSchema, type LoginInput } from "@/types";
import { isSupabaseConfigured } from "@/types";

export function LoginForm() {
  const router = useRouter();
  const supabase = useSupabase();
  const toast = useToast();
  const supabaseReady = isSupabaseConfigured();

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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {!supabaseReady ? (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-100">
          Supabase no está configurado. Añade las claves en{" "}
          <code className="font-mono text-xs">.env.local</code> y crea las tablas
          de <code className="font-mono text-xs">supabase/schema.sql</code> para
          poder iniciar sesión.
        </div>
      ) : null}

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

      <Field label="Contraseña" htmlFor="password" error={errors.password}>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          invalid={Boolean(errors.password)}
          {...register("password")}
        />
      </Field>

      <Button type="submit" loading={isSubmitting} className="w-full">
        Iniciar sesión
      </Button>
    </form>
  );
}
