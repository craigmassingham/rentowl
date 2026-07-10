import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProperty } from "../../actions";
import { PropertyForm } from "../../property-form";

export const metadata: Metadata = { title: "Edit property — RentOwl" };

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!property) {
    notFound();
  }

  const updateAction = updateProperty.bind(null, property.id);

  return (
    <main className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight">Edit property</h1>
      <p className="mt-2 text-muted-foreground">{property.address_line_1}</p>
      <div className="mt-6">
        <PropertyForm
          action={updateAction}
          defaults={property}
          submitLabel="Save changes"
          cancelHref={`/app/properties/${property.id}`}
        />
      </div>
    </main>
  );
}
