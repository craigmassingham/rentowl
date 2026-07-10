import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProspectiveTenantSchema } from "@rentowl/shared";
import { createClient } from "@/lib/supabase/server";
import { updateTenancy } from "../../actions";
import { TenancyForm } from "../../tenancy-form";

export const metadata: Metadata = { title: "Edit tenancy — RentOwl" };

export default async function EditTenancyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: tenancy } = await supabase
    .from("tenancies")
    .select("*, properties (address_line_1, address_line_2)")
    .eq("id", id)
    .maybeSingle();

  if (!tenancy) {
    notFound();
  }

  const tenantParse = ProspectiveTenantSchema.safeParse(tenancy.prospective_tenant);
  const tenant = tenantParse.success ? tenantParse.data : null;
  const updateAction = updateTenancy.bind(null, tenancy.id);

  return (
    <main className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight">Edit tenancy</h1>
      <p className="mt-2 text-muted-foreground">
        {tenancy.properties?.address_line_1}
        {tenancy.properties?.address_line_2
          ? `, ${tenancy.properties.address_line_2}`
          : ""}
      </p>
      <div className="mt-6">
        <TenancyForm
          action={updateAction}
          defaults={{
            tenant_name: tenant?.full_name ?? "",
            tenant_email: tenant?.email ?? "",
            tenant_phone: tenant?.phone ?? "",
            start_date: tenancy.start_date,
            end_date: tenancy.end_date,
            monthly_rent_sgd: Number(tenancy.monthly_rent_sgd),
            deposit_sgd: Number(tenancy.deposit_sgd),
            payment_day: tenancy.payment_day,
            status: tenancy.status,
          }}
          submitLabel="Save changes"
          cancelHref={`/app/tenancies/${tenancy.id}`}
          showStatus
        />
      </div>
    </main>
  );
}
