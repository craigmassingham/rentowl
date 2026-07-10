import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ProspectiveTenantSchema,
  TENANCY_STATUS_LABELS,
  formatDate,
  formatSGD,
} from "@rentowl/shared";
import { Button } from "@rentowl/ui";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Tenancy — RentOwl" };

export default async function TenancyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: tenancy } = await supabase
    .from("tenancies")
    .select(
      "*, properties (id, address_line_1, address_line_2, postal_code)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!tenancy || !tenancy.properties) {
    notFound();
  }

  const property = tenancy.properties;
  const tenantParse = ProspectiveTenantSchema.safeParse(tenancy.prospective_tenant);
  const tenant = tenantParse.success ? tenantParse.data : null;

  const facts: [string, string][] = [
    ["Status", TENANCY_STATUS_LABELS[tenancy.status]],
    ["Start date", formatDate(tenancy.start_date)],
    ["End date", formatDate(tenancy.end_date)],
    ["Monthly rent", formatSGD(Number(tenancy.monthly_rent_sgd))],
    ["Deposit", formatSGD(Number(tenancy.deposit_sgd))],
    ["Rent due", `Day ${tenancy.payment_day} of each month`],
  ];

  return (
    <main className="mx-auto max-w-4xl">
      <Link
        href={`/app/properties/${property.id}`}
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← {property.address_line_1}
        {property.address_line_2 ? `, ${property.address_line_2}` : ""}
      </Link>
      <div className="mt-2 flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Tenancy — {tenant?.full_name ?? "tenant"}
        </h1>
        <Button variant="outline" asChild className="shrink-0">
          <Link href={`/app/tenancies/${tenancy.id}/edit`}>Edit</Link>
        </Button>
      </div>

      <dl className="mt-6 grid max-w-md gap-3">
        {facts.map(([label, value]) => (
          <div key={label} className="flex justify-between border-b pb-2 text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      {tenant ? (
        <div className="mt-8 max-w-md">
          <h2 className="text-sm font-medium text-muted-foreground">Tenant</h2>
          <dl className="mt-2 grid gap-3">
            <div className="flex justify-between border-b pb-2 text-sm">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">{tenant.full_name}</dd>
            </div>
            <div className="flex justify-between border-b pb-2 text-sm">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium">{tenant.email}</dd>
            </div>
            <div className="flex justify-between border-b pb-2 text-sm">
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="font-medium">{tenant.phone}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            The tenant gets access when they accept an invite — invites arrive
            with rent reminders in a later update.
          </p>
        </div>
      ) : null}
    </main>
  );
}
