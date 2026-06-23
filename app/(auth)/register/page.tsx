import Link from "next/link";
import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Crear cuenta",
};

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold text-zinc-50">
          Crea tu cuenta
        </h1>
        <p className="text-sm text-zinc-400">
          Recibe alertas por email cuando se detecten nuevos incendios en tus
          provincias
        </p>
      </header>

      <RegisterForm />

      <p className="text-center text-sm text-zinc-400">
        ¿Ya tienes cuenta?{" "}
        <Link
          href="/login"
          className="font-medium text-orange-300 hover:text-orange-200"
        >
          Iniciar sesión
        </Link>
      </p>
    </div>
  );
}
