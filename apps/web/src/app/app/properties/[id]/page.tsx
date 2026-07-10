import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  PROPERTY_TYPE_LABELS,
  ProspectiveTenantSchema,
  TENANCY_STATUS_LABELS,
  formatDate,
  formatSGD,
} from "@rentowl/shared";
import { Button } from "@rentowl/ui";
import { createClient } from "@/lib/supabase/server";
import { DeletePropertyDialog } from "./delete-property-dialog";

export const metadata: Metadata = { title: "Property — RentOwl" };

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // RLS returns zero rows for other landlords' properties — same as not existing.
  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!property) {
    notFound();
  }

  const { data: tenancies } = await supabase
    .from("tenancies")
    .select("id, prospective_tenant, start_date, end_date, monthly_rent_sgd, status")
    .eq("property_id", property.id)
    .order("start_date", { ascending: false });

  const facts: [string, string][] = [
    ["Property type", PROPERTY_TYPE_LABELS[property.property_type]],
    ["Postal code", property.postal_code],
    ...(property.bedrooms != null ? ([["Bedrooms", String(property.bedrooms)]] as [string, string][]) : []),
    ...(property.bathrooms != null ? ([["Bathrooms", String(property.bathrooms)]] as [string, string][]) : []),
    ...(property.floor_area_sqft != null
      ? ([["Floor area", `${property.floor_area_sqft} sqft`]] as [string, string][])
      : []),
  ];

  return (
    <main className="mx-auto max-w-4xl">
      <Link
        href="/app/properties"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Properties
      </Link>
      <div className="mt-2 flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          {property.address_line_1}
          {property.address_line_2 ? `, ${property.address_line_2}` : ""}
        </h1>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" asChild>
            <Link href={`/app/properties/${property.id}/edit`}>Edit</Link>
          </Button>
          <DeletePropertyDialog
            propertyId={property.id}
            addressLine1={property.address_line_1}
          />
        </div>
      </div>

      <dl className="mt-6 grid max-w-md gap-3">
        {facts.map(([label, value]) => (
          <div key={label} className="flex justify-between border-b pb-2 text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      {property.notes ? (
        <div className="mt-6 max-w-md">
          <h2 className="text-sm font-medium text-muted-foreground">Notes</h2>
          <p className="mt-1 text-sm">{property.notes}</p>
        </div>
      ) : null}

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Tenancies</h2>
          <Button variant="outline" asChild>
            <Link href={`/app/properties/${property.id}/tenancies/new`}>
              Add tenancy
            </Link>
          </Button>
        </div>
        {!tenancies || tenancies.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No tenancy recorded yet. Add one to track rent and generate the
            agreement.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {tenancies.map((tenancy) => {
              const tenantParse = ProspectiveTenantSchema.safeParse(
                tenancy.prospective_tenant
              );
              const tenantName = tenantParse.success
                ? tenantParse.data.full_name
                : "Tenant";
              return (
                <li key={tenancy.id}>
                  <Link
                    href={`/app/tenancies/${tenancy.id}`}
                    className="block rounded-lg border p-4 transition-colors hover:bg-accent"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">{tenantName}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatDate(tenancy.start_date)} –{" "}
                          {formatDate(tenancy.end_date)} ·{" "}
                          {formatSGD(Number(tenancy.monthly_rent_sgd))}/mo
                        </p>
                      </div>
                      <span className="rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground">
                        {TENANCY_STATUS_LABELS[tenancy.status]}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
