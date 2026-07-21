import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@rentowl/db";

/**
 * Service-role Supabase client — bypasses RLS. SERVER-ONLY.
 *
 * Used exclusively for operations the anon/authenticated roles can't do:
 * writing generated PDFs to the private tenancy-agreements bucket and
 * streaming them back after the caller has been authorized against
 * tenancy_agreements RLS. Never import this into a Client Component.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase admin client needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
