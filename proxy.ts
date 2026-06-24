import { type NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 renombró el file convention `middleware.ts` → `proxy.ts`
 * y la función exportada `middleware` → `proxy`. El comportamiento es
 * idéntico (corre antes del request handler) — sólo cambia naming.
 *
 * Sigue refrescando la sesión Supabase en cada navegación para que
 * tokens caducados se renueven transparentemente vía @supabase/ssr.
 */
export async function proxy(request: NextRequest) {
  return updateSupabaseSession(request);
}

export const config = {
  matcher: [
    /*
     * Skip Next.js internals, static files, common assets and Next image
     * optimizations so the Supabase session refresher never sees them.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$).*)",
  ],
};
