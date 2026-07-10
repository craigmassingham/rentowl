import type { Metadata } from "next";
import { createProperty } from "../actions";
import { PropertyForm } from "../property-form";

export const metadata: Metadata = { title: "Add property — RentOwl" };

export default function NewPropertyPage() {
  return (
    <main className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight">Add property</h1>
      <p className="mt-2 text-muted-foreground">
        The address as it appears on the tenancy agreement.
      </p>
      <div className="mt-6">
        <PropertyForm
          action={createProperty}
          submitLabel="Add property"
          cancelHref="/app/properties"
        />
      </div>
    </main>
  );
}
