export { createSupabaseBrowserClient } from "./browser";
export { createSupabaseServerClient, type CookieAdapter } from "./server";

// Generated via `supabase gen types typescript --local`. Regenerate after
// every migration: pnpm --filter @rentowl/db gen:types
export type { Database, Tables, TablesInsert, TablesUpdate, Enums } from "./database.types";
