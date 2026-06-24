import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { isSupabaseConfigured } from "@/types";

/**
 * Server-side Supabase client. Used inside Server Components, Route
 * Handlers and Server Actions. Pairs with `middleware.ts` which keeps the
 * session cookies refreshed.
 *
 * When Supabase is not configured this returns a deterministic mock.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  if (!isSupabaseConfigured()) {
    return createServerMockClient();
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll called from a Server Component which cannot set cookies;
            // safe to ignore — middleware refreshes them on every request.
          }
        },
      },
    }
  );
}

/* -------------------------------------------------------------------------- */
/*                              Server mock client                            */
/* -------------------------------------------------------------------------- */

interface ServerBuilder<T = unknown> {
  select: (cols?: string) => ServerBuilder<T>;
  insert: (rows: unknown[]) => ServerBuilder<T>;
  update: (patch: object) => ServerBuilder<T>;
  delete: () => ServerBuilder<T>;
  eq: (col: string, val: unknown) => ServerBuilder<T>;
  order: (col: string, opts?: { ascending?: boolean }) => ServerBuilder<T>;
  limit: (n: number) => ServerBuilder<T>;
  match: (q: Record<string, unknown>) => ServerBuilder<T>;
  single: () => Promise<{ data: T | null; error: Error | null }>;
  maybeSingle: () => Promise<{ data: T | null; error: Error | null }>;
  then: <R>(
    onFulfilled: (value: { data: T[]; error: Error | null }) => R | PromiseLike<R>
  ) => Promise<R>;
}

function makeServer<T>(initial: T[]): ServerBuilder<T> {
  const data = initial;
  const result = { data, error: null as Error | null };

  const single: ServerBuilder<T>["single"] = () =>
    Promise.resolve({ data: data[0] ?? null, error: null });
  const maybeSingle = single;

  const then: ServerBuilder<T>["then"] = (onFulfilled) =>
    Promise.resolve().then(() => onFulfilled(result));

  const chain: ServerBuilder<T> = {
    select: () => chain,
    insert: () => chain,
    update: () => chain,
    delete: () => chain,
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

interface ServerMockClient {
  auth: {
    getUser: () => Promise<{ data: { user: null }; error: null }>;
    getSession: () => Promise<{ data: { session: null }; error: null }>;
    // No-op in demo mode: there's no session cookie to clear. Mirrors
    // the browser mock so route handlers (signout endpoint, etc.) can
    // typecheck against the union and the union handler without casts.
    signOut: () => Promise<{ error: null }>;
  };
  from: (_table: string) => ServerBuilder<unknown>;
}

function createServerMockClient(): ServerMockClient {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signOut: async () => ({ error: null }),
    },
    from: () => makeServer([]),
  };
}
