"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase, useToast } from "@/components/Providers";
import { Field, Input } from "@/components/ui/Field";
import { FlameGlyph } from "@/components/icons/FlameGlyph";

export default function RecoveryPage() {
  const router = useRouter();
  const supabase = useSupabase();
  const toast = useToast();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    if (password.length < 6) {
      toast.push("La contraseña debe tener al menos 6 caracteres", "error");
      return;
    }
    if (password !== confirmPassword) {
      toast.push("Las contraseñas no coinciden", "error");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (error) {
      toast.push(error.message || "Error al actualizar contraseña", "error");
      return;
    }

    toast.push("Contraseña actualizada con éxito. Redirigiendo...", "success");
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 2000);
  };

  return (
    <div className="mx-auto max-w-md p-6 space-y-6 rounded-2xl border border-border bg-surface shadow-2xl mt-12 animate-fade-in">
      <header className="space-y-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-fire/10">
          <FlameGlyph className="h-6 w-6 text-fire" />
        </div>
        <h1 className="text-xl font-bold text-zinc-50">Nueva contraseña</h1>
        <p className="text-xs text-textSecondary">
          Ingresa y confirma la nueva contraseña para tu cuenta institucional.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nueva contraseña" htmlFor="password" hint="Mínimo 6 caracteres.">
          <Input
            id="password"
            type="password"
            placeholder="•••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>

        <Field label="Confirmar contraseña" htmlFor="confirmPassword">
          <Input
            id="confirmPassword"
            type="password"
            placeholder="•••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </Field>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-fire px-4 text-sm font-semibold text-textPrimary transition-colors hover:bg-fire/80 disabled:opacity-60"
        >
          {submitting ? "Actualizando..." : "Restablecer contraseña"}
        </button>
      </form>
    </div>
  );
}
