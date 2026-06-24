import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/types";

/**
 * Service-role Supabase client for server-side privileged operations.
 *
 * Bypasses RLS — use ONLY from server code paths that have already
 * authenticated/authorised the request:
 *
 *   - /api/subscribe DELETE — caller has verified the HMAC unsubscribe
 *     token BEFORE reaching this client, so the privileged delete is
 *     safe.
 *   - …any future cron-adjacent routes that need raw table access.
 *
 * Do NOT chain this into the regular auth flow, and do NOT expose it
 * to the browser or anon route handlers.
 *
 * Falls back to a deterministic mock when Supabase is not configured
 * so the Next.js dev server keeps working end-to-end without env vars.
 */
export function createSupabaseServiceRoleClient() {
  if (!isSupabaseConfigured()) {
    return createServiceRoleMockClient();
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    {
      auth: {
        // Service-role never stores/refreshes sessions — it's an
        // out-of-band caller, not an end-user auth flow.
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}

/* -------------------------------------------------------------------------- */
/*                         Service-role mock client                            */
/* -------------------------------------------------------------------------- */

interface ServiceRoleBuilder<T = unknown> {
  select: (cols?: string) => ServiceRoleBuilder<T>;
  insert: (rows: unknown[]) => ServiceRoleBuilder<T>;
  update: (patch: object) => ServiceRoleBuilder<T>;
  delete: () => ServiceRoleBuilder<T>;
  upsert: (rows: unknown[]) => ServiceRoleBuilder<T>;
  eq: (col: string, val: unknown) => ServiceRoleBuilder<T>;
  order: (col: string, opts?: { ascending?: boolean }) => ServiceRoleBuilder<T>;
  limit: (n: number) => ServiceRoleBuilder<T>;
  match: (q: Record<string, unknown>) => ServiceRoleBuilder<T>;
  single: () => Promise<{ data: T | null; error: null }>;
  maybeSingle: () => Promise<{ data: T | null; error: null }>;
  then: <R>(
    onFulfilled: (value: { data: T[]; error: null }) => R | PromiseLike<R>,
  ) => Promise<R>;
}

function makeServiceRoleChain<T>(initial: T[]): ServiceRoleBuilder<T> {
  const result = { data: initial, error: null as null };

  const single: ServiceRoleBuilder<T>["single"] = () =>
    Promise.resolve({ data: result.data[0] ?? null, error: null });
  const maybeSingle = single;

  const then: ServiceRoleBuilder<T>["then"] = (onFulfilled) =>
    Promise.resolve().then(() => onFulfilled(result));

  const chain: ServiceRoleBuilder<T> = {
    select: () => chain,
    insert: () => chain,
    update: () => chain,
    delete: () => chain,
    upsert: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    match: () => chain,
    single,
    maybeSingle,
    then,
  };
  return chain;
}

interface ServiceRoleMockClient {
  from: (_table: string) => ServiceRoleBuilder<unknown>;
}

function createServiceRoleMockClient(): ServiceRoleMockClient {
  return {
    from: () => makeServiceRoleChain([]),
  };
}
