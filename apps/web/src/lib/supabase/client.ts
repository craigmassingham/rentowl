import { createSupabaseBrowserClient } from "@rentowl/db";

/** Supabase client for Client Components. */
export function createClient() {
  return createSupabaseBrowserClient();
}
