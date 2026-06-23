import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold text-zinc-50">
          Inicia sesión
        </h1>
        <p className="text-sm text-zinc-400">
          Gestiona tus suscripciones a alertas de incendios por provincia
        </p>
      </header>

      <LoginForm />

      <p className="text-center text-sm text-zinc-400">
        ¿No tienes cuenta?{" "}
        <Link
          href="/register"
          className="font-medium text-orange-300 hover:text-orange-200"
        >
          Crear cuenta
        </Link>
      </p>
    </div>
  );
}
