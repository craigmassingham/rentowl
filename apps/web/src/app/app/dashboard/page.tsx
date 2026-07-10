import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard — RentOwl" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email ??
    "there";

  return (
    <main className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight">Hello, {name}</h1>
      <p className="mt-2 text-muted-foreground">
        Your dashboard is on its way. Next up: add your first property.
      </p>
    </main>
  );
}
