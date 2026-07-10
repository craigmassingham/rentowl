import { redirect } from "next/navigation";
import { Button } from "@rentowl/ui";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already guards /app/*; this is defence in depth.
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <span className="font-semibold">RentOwl</span>
        <form action="/logout" method="post">
          <Button variant="ghost" size="sm" type="submit">
            Log out
          </Button>
        </form>
      </header>
      <div className="px-6 py-8">{children}</div>
    </div>
  );
}
