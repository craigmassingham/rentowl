import type { Metadata } from "next";
import Link from "next/link";
import { PROPERTY_TYPE_LABELS } from "@rentowl/shared";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@rentowl/ui";
import { createClient } from "@/lib/supabase/server";
import { FirstRunTip } from "./first-run-tip";

export const metadata: Metadata = { title: "Dashboard — RentOwl" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name =
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    user?.email ??
    "there";

  const [{ data: properties }, { count: activeTenancies }] = await Promise.all([
    supabase
      .from("properties")
      .select("id, address_line_1, address_line_2, postal_code, property_type")
      .order("created_at", { ascending: false }),
    supabase
      .from("tenancies")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
  ]);

  const propertyCount = properties?.length ?? 0;

  // First-run: no properties yet — guide the landlord into onboarding.
  if (propertyCount === 0) {
    return (
      <main className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome, {name}</h1>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Let&apos;s get you set up</CardTitle>
            <CardDescription>
              Add your property, add the tenancy, and generate a tenancy
              agreement — about five minutes, and you can stop and resume any
              time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/app/onboarding">Start setup</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  // Post-completion summary — replaces the empty state once there's data.
  return (
    <main className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Hello, {name}</h1>
        <Button variant="outline" asChild>
          <Link href="/app/properties/new">Add property</Link>
        </Button>
      </div>

      <FirstRunTip />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Properties</CardDescription>
            <CardTitle className="text-3xl">{propertyCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active tenancies</CardDescription>
            <CardTitle className="text-3xl">{activeTenancies ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-muted-foreground">Your properties</h2>
        <ul className="mt-3 grid gap-3">
          {properties!.map((property) => (
            <li key={property.id}>
              <Link
                href={`/app/properties/${property.id}`}
                className="flex items-center justify-between gap-4 rounded-lg border p-4 transition-colors hover:bg-accent"
              >
                <div>
                  <p className="font-medium">
                    {property.address_line_1}
                    {property.address_line_2 ? `, ${property.address_line_2}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Singapore {property.postal_code}
                  </p>
                </div>
                <span className="rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground">
                  {PROPERTY_TYPE_LABELS[property.property_type]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
