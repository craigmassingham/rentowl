import type { Metadata } from "next";
import Link from "next/link";
import {
  PROPERTY_TYPE_LABELS,
  ProspectiveTenantSchema,
  daysUntil,
  formatDate,
  formatSGD,
  nextRentDueDate,
} from "@rentowl/shared";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@rentowl/ui";
import { createClient } from "@/lib/supabase/server";
import { FirstRunTip } from "./first-run-tip";

export const metadata: Metadata = { title: "Dashboard — RentOwl" };

function firstName(full: string): string {
  return full.split(" ")[0] ?? full;
}

/** A stat/summary card: label, a large value, and an optional sub-line. */
function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      {sub ? (
        <CardContent className="pt-0 text-sm text-muted-foreground">{sub}</CardContent>
      ) : null}
    </Card>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name =
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    user?.email ??
    "there";

  const [{ data: properties }, { data: tenancies }, { data: agreementRows }] =
    await Promise.all([
      supabase
        .from("properties")
        .select("id, address_line_1, address_line_2, postal_code, property_type")
        .order("created_at", { ascending: false }),
      supabase
        .from("tenancies")
        .select("id, property_id, status, prospective_tenant, monthly_rent_sgd, payment_day, end_date"),
      supabase.from("tenancy_agreements").select("tenancy_id"),
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

  const activeTenancies = (tenancies ?? []).filter((t) => t.status === "active");
  const agreementTenancyIds = new Set((agreementRows ?? []).map((a) => a.tenancy_id));
  const activeByProperty = new Map(activeTenancies.map((t) => [t.property_id, t]));
  const propertyById = new Map((properties ?? []).map((p) => [p.id, p]));

  // Upcoming rent due — soonest across active tenancies, within the term.
  let upcomingRent: { date: Date; amount: number; tenant: string } | null = null;
  for (const t of activeTenancies) {
    const due = nextRentDueDate(t.payment_day);
    if (due > new Date(t.end_date)) continue;
    if (!upcomingRent || due < upcomingRent.date) {
      const parsed = ProspectiveTenantSchema.safeParse(t.prospective_tenant);
      upcomingRent = {
        date: due,
        amount: Number(t.monthly_rent_sgd),
        tenant: parsed.success ? parsed.data.full_name : "tenant",
      };
    }
  }

  // Next renewal — soonest tenancy end date still in the future.
  let nextRenewal: { date: Date; property: string; days: number } | null = null;
  for (const t of activeTenancies) {
    const end = new Date(t.end_date);
    if (daysUntil(end) < 0) continue;
    if (!nextRenewal || end < nextRenewal.date) {
      nextRenewal = {
        date: end,
        property: propertyById.get(t.property_id)?.address_line_1 ?? "property",
        days: daysUntil(end),
      };
    }
  }

  function quickAction(propertyId: string): { label: string; href: string } {
    const t = activeByProperty.get(propertyId);
    if (!t) {
      return { label: "Add tenancy", href: `/app/properties/${propertyId}/tenancies/new` };
    }
    if (agreementTenancyIds.has(t.id)) {
      return { label: "View tenancy", href: `/app/tenancies/${t.id}` };
    }
    return { label: "Generate agreement", href: `/app/tenancies/${t.id}/agreement/new` };
  }

  return (
    <main className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Hello, {name}</h1>
        <Button variant="outline" asChild>
          <Link href="/app/properties/new">Add property</Link>
        </Button>
      </div>

      <FirstRunTip />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Properties" value={String(propertyCount)} />
        <StatCard label="Active tenancies" value={String(activeTenancies.length)} />
        <StatCard
          label="Next rent due"
          value={upcomingRent ? formatDate(upcomingRent.date) : "—"}
          sub={
            upcomingRent
              ? `${formatSGD(upcomingRent.amount)} · ${firstName(upcomingRent.tenant)}`
              : "Nothing scheduled"
          }
        />
        <StatCard
          label="Next renewal"
          value={nextRenewal ? formatDate(nextRenewal.date) : "—"}
          sub={
            nextRenewal
              ? `${nextRenewal.property} · in ${nextRenewal.days} days`
              : "Nothing scheduled"
          }
        />
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-muted-foreground">Your properties</h2>
        <ul className="mt-3 grid gap-3">
          {properties!.map((property) => {
            const action = quickAction(property.id);
            return (
              <li
                key={property.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
              >
                <div className="min-w-0">
                  <Link
                    href={`/app/properties/${property.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {property.address_line_1}
                    {property.address_line_2 ? `, ${property.address_line_2}` : ""}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Singapore {property.postal_code} ·{" "}
                    {PROPERTY_TYPE_LABELS[property.property_type]}
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={action.href}>{action.label}</Link>
                </Button>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
