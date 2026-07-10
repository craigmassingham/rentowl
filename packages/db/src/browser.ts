import { createBrowserClient } from "@supabase/ssr";

/** Supabase client for client components. Anon key only — RLS is the authorization layer. */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
