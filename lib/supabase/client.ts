import { createBrowserClient } from "@supabase/ssr";
import { isSupabaseConfigured } from "@/types";

/**
 * Browser-side Supabase client. When Supabase is not configured, returns a
 * deterministic no-op mock so the UI can run in local demo mode.
 */
export function createSupabaseBrowserClient() {
  if (!isSupabaseConfigured()) {
    return createMockClient();
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/* -------------------------------------------------------------------------- */
/*                                Mock client                                 */
/* -------------------------------------------------------------------------- */

type MaybeArray<T> = T | T[];

interface MockQueryResult<T> {
  data: T;
  error: Error | null;
}

interface MockBuilder<T = unknown> {
  select: (cols?: string) => MockBuilder<T>;
  insert: (rows: MaybeArray<unknown>) => MockBuilder<T>;
  upsert: (rows: MaybeArray<unknown>) => MockBuilder<T>;
  update: (patch: object) => MockBuilder<T>;
  delete: () => MockBuilder<T>;
  eq: (col: string, val: unknown) => MockBuilder<T>;
  order: (col: string, opts?: { ascending?: boolean }) => MockBuilder<T>;
  limit: (n: number) => MockBuilder<T>;
  match: (query: Record<string, unknown>) => MockBuilder<T>;
  single: () => Promise<MockQueryResult<T | null>>;
  maybeSingle: () => Promise<MockQueryResult<T | null>>;
  then: <R>(
    onFulfilled: (value: MockQueryResult<T | T[]>) => R | PromiseLike<R>
  ) => Promise<R>;
}

function ok<T>(data: T): MockQueryResult<T> {
  return { data, error: null };
}

function err<T>(message: string, data: T): MockQueryResult<T> {
  return {
    data,
    error: new Error(
      `${message} (Supabase no configurado — añade NEXT_PUBLIC_SUPABASE_URL/ANON_KEY en .env.local)`
    ),
  };
}

function createChain<T>(data: T | T[], mode: "allow" | "error"): MockBuilder<T> {
  const single = (): Promise<MockQueryResult<T | null>> => {
    if (mode === "error") {
      return Promise.resolve(err("Operación no soportada en mock", null));
    }
    const value = Array.isArray(data) ? data[0] ?? null : data;
    return Promise.resolve(ok(value));
  };

  const then: MockBuilder<T>["then"] = (onFulfilled) =>
    Promise.resolve().then(() => {
      const payload = mode === "error" ? err("Operación no soportada", data) : ok(data);
      return onFulfilled(payload);
    });

  const chain: MockBuilder<T> = {
    select: () => chain,
    insert: () => chain,
    upsert: () => chain,
    update: () => chain,
    delete: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    match: () => chain,
    single,
    maybeSingle: single,
    then,
  };
  return chain;
}

interface MockClient {
  auth: {
    getUser: () => Promise<{ data: { user: null }; error: null }>;
    getSession: () => Promise<{ data: { session: null }; error: null }>;
    signInWithPassword: (_: {
      email: string;
      password: string;
    }) => Promise<{
      data: { user: null; session: null };
      error: Error;
    }>;
    signUp: (_: {
      email: string;
      password: string;
      options?: { data?: Record<string, unknown> };
    }) => Promise<{
      data: { user: null; session: null };
      error: Error;
    }>;
    signOut: () => Promise<{ error: null }>;
    onAuthStateChange: () => {
      data: { subscription: { unsubscribe: () => void } };
    };
  };
  from: (_table: string) => MockBuilder<unknown>;
}

function createMockClient(): MockClient {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: new Error(
          "Supabase no está configurado. Añade NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY a .env.local."
        ),
      }),
      signUp: async () => ({
        data: { user: null, session: null },
        error: new Error(
          "Supabase no está configurado. Añade NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY a .env.local."
        ),
      }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
    from: () => createChain([], "error"),
  };
}
