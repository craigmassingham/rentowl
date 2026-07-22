import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@rentowl/ui";
import { createClient } from "@/lib/supabase/server";
import { FeedbackDialog } from "./feedback-dialog";

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
        <div className="flex items-center gap-6">
          <span className="font-semibold">RentOwl</span>
          <nav className="flex gap-4 text-sm">
            <Link
              href="/app/dashboard"
              className="text-muted-foreground hover:text-foreground"
            >
              Dashboard
            </Link>
            <Link
              href="/app/properties"
              className="text-muted-foreground hover:text-foreground"
            >
              Properties
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-1">
          <FeedbackDialog />
          <form action="/logout" method="post">
            <Button variant="ghost" size="sm" type="submit">
              Log out
            </Button>
          </form>
        </div>
      </header>
      <div className="px-6 py-8">{children}</div>
    </div>
  );
}
