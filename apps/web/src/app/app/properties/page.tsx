import type { Metadata } from "next";
import Link from "next/link";
import { PROPERTY_TYPE_LABELS } from "@rentowl/shared";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@rentowl/ui";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Properties — RentOwl" };

export default async function PropertiesPage() {
  const supabase = await createClient();
  const { data: properties, error } = await supabase
    .from("properties")
    .select("id, address_line_1, address_line_2, postal_code, property_type, bedrooms, bathrooms")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Couldn't load your properties.");
  }

  return (
    <main className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Properties</h1>
        {properties.length > 0 ? (
          <Button asChild>
            <Link href="/app/properties/new">Add property</Link>
          </Button>
        ) : null}
      </div>

      {properties.length === 0 ? (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Add your first property</CardTitle>
            <CardDescription>
              Start with the address — you can add the tenancy and agreement after.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/app/properties/new">Add property</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="mt-6 grid gap-3">
          {properties.map((property) => (
            <li key={property.id}>
              <Link
                href={`/app/properties/${property.id}`}
                className="block rounded-lg border p-4 transition-colors hover:bg-accent"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">
                      {property.address_line_1}
                      {property.address_line_2 ? `, ${property.address_line_2}` : ""}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Singapore {property.postal_code}
                      {property.bedrooms != null ? ` · ${property.bedrooms} bed` : ""}
                      {property.bathrooms != null ? ` · ${property.bathrooms} bath` : ""}
                    </p>
                  </div>
                  <span className="rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground">
                    {PROPERTY_TYPE_LABELS[property.property_type]}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
