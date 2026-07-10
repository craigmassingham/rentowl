import { createServerClient } from "@supabase/ssr";

/**
 * Framework-agnostic cookie adapter so this package doesn't depend on Next.js.
 * apps/web wraps this with next/headers cookies() — see apps/web/src/lib/supabase.
 */
export interface CookieAdapter {
  getAll(): { name: string; value: string }[];
  setAll(
    cookies: {
      name: string;
      value: string;
      options?: Record<string, unknown>;
    }[]
  ): void;
}

/** Supabase client for server components, route handlers, and middleware. */
export function createSupabaseServerClient(cookies: CookieAdapter) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies }
  );
}
