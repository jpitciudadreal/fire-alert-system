"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSupabase, useToast } from "@/components/Providers";

export function SignOutButton() {
  const router = useRouter();
  const supabase = useSupabase();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    setLoading(false);
    if (error) {
      toast.push(error.message, "error");
      return;
    }
    toast.push("Sesión cerrada", "success");
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={loading}
      className="rounded-xl border border-zinc-700 bg-zinc-900/60 px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-zinc-800/60 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "Cerrando…" : "Cerrar sesión"}
    </button>
  );
}
