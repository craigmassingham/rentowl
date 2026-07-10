import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** POST-only — logging out via GET invites CSRF and prefetch accidents. */
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/login`, { status: 303 });
}
