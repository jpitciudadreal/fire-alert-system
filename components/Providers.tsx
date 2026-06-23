"use client";

import * as React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Single client provider tree. Holds the Supabase browser client so any
 * nested client component can grab it without re-creating per render.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [supabase] = React.useState<SupabaseClient>(
    () => createSupabaseBrowserClient() as unknown as SupabaseClient
  );

  return (
    <SupabaseContext.Provider value={supabase}>{children}</SupabaseContext.Provider>
  );
}

const SupabaseContext = React.createContext<SupabaseClient | null>(null);

export function useSupabase(): SupabaseClient {
  const ctx = React.useContext(SupabaseContext);
  if (!ctx) {
    throw new Error("useSupabase must be used inside <Providers>");
  }
  return ctx;
}

/** Tiny top-bar toast hook used for success / error feedback */
type ToastTone = "success" | "error" | "info";
type Toast = { id: number; message: string; tone: ToastTone };

const ToastContext = React.createContext<{
  push: (message: string, tone?: ToastTone) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const idRef = React.useRef(0);

  const push = React.useCallback((message: string, tone: ToastTone = "info") => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[9999] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={[
              "pointer-events-auto rounded-xl border px-4 py-2.5 text-sm shadow-2xl",
              "backdrop-blur transition-all animate-[slide-in_0.2s_ease-out]",
              t.tone === "success" &&
                "border-emerald-500/30 bg-emerald-500/15 text-emerald-100",
              t.tone === "error" &&
                "border-red-500/30 bg-red-500/15 text-red-100",
              t.tone === "info" &&
                "border-sky-500/30 bg-sky-500/15 text-sky-100",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx;
}
