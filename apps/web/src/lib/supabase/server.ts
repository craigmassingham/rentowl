import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@rentowl/db";

/** Supabase client for Server Components and Route Handlers. */
export async function createClient() {
  const cookieStore = await cookies();

  return createSupabaseServerClient({
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet) {
      try {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        );
      } catch {
        // Called from a Server Component — session refresh is handled by middleware.
      }
    },
  });
}
