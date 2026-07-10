import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createTenancy } from "../../../../tenancies/actions";
import { TenancyForm } from "../../../../tenancies/tenancy-form";

export const metadata: Metadata = { title: "Add tenancy — RentOwl" };

export default async function NewTenancyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: property } = await supabase
    .from("properties")
    .select("id, address_line_1, address_line_2")
    .eq("id", id)
    .maybeSingle();

  if (!property) {
    notFound();
  }

  const createAction = createTenancy.bind(null, property.id);

  return (
    <main className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight">Add tenancy</h1>
      <p className="mt-2 text-muted-foreground">
        {property.address_line_1}
        {property.address_line_2 ? `, ${property.address_line_2}` : ""}
      </p>
      <div className="mt-6">
        <TenancyForm
          action={createAction}
          submitLabel="Add tenancy"
          cancelHref={`/app/properties/${property.id}`}
        />
      </div>
    </main>
  );
}
