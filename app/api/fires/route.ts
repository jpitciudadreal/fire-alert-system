import { getFires } from "@/lib/firms/client";
import type { FireResponse } from "@/types";

/**
 * GET /api/fires
 *
 * Public endpoint that returns active fire points for Spain. When the
 * NASA FIRMS API key is configured the response is cached by Next.js for
 * one hour; otherwise the deterministic mock dataset is returned so the
 * UI can always render something meaningful.
 */
export async function GET(): Promise<Response> {
  const payload: FireResponse = await getFires();

  return Response.json(payload, {
    headers: {
      "Cache-Control": payload.isMock
        ? "no-store"
        : "public, s-maxage=3600, stale-while-revalidate=86400",
      "X-Data-Source": payload.source,
    },
  });
}
