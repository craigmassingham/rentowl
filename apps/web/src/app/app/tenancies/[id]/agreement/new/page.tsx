import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProspectiveTenantSchema } from "@rentowl/shared";
import { getClauseLibrary } from "@rentowl/shared/clauses";
import { createClient } from "@/lib/supabase/server";
import { generateAgreement } from "../actions";
import { AgreementOptionsForm } from "./agreement-options-form";

export const metadata: Metadata = { title: "Generate agreement — RentOwl" };

export default async function NewAgreementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: tenancy } = await supabase
    .from("tenancies")
    .select("id, prospective_tenant, properties (property_type)")
    .eq("id", id)
    .maybeSingle();

  if (!tenancy || !tenancy.properties) {
    notFound();
  }

  const tenant = ProspectiveTenantSchema.safeParse(tenancy.prospective_tenant);
  const propertyType = tenancy.properties.property_type;

  // Clauses that will be included for this property type (required ones), so
  // the landlord sees the agreement's shape before generating. Diplomatic is
  // an option in the form, not shown here.
  const includedClauses = getClauseLibrary()
    .filter((c) => c.applicability.includes(propertyType) && c.required)
    .map((c) => ({ clause_id: c.clause_id, title: c.title }));

  const diplomaticApplicable = propertyType !== "hdb";
  const generate = generateAgreement.bind(null, tenancy.id);

  return (
    <main className="mx-auto max-w-4xl">
      <Link
        href={`/app/tenancies/${tenancy.id}`}
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Tenancy
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        Generate tenancy agreement
      </h1>
      <p className="mt-2 text-muted-foreground">
        RentOwl assembles the agreement from Singapore-standard clauses and
        fills in this tenancy&apos;s details. Review the options, then generate
        a PDF you can download and sign.
      </p>

      {!tenant.success ? (
        <div className="mt-6 rounded-lg border border-warning/40 bg-warning/5 p-4 text-sm">
          Add the tenant&apos;s details on this tenancy before generating an
          agreement.{" "}
          <Link
            href={`/app/tenancies/${tenancy.id}/edit`}
            className="underline underline-offset-4"
          >
            Edit tenancy
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-8 md:grid-cols-[1fr_1.2fr]">
          <section>
            <h2 className="text-sm font-medium text-muted-foreground">
              Clauses included
            </h2>
            <ol className="mt-3 grid gap-2 text-sm">
              {includedClauses.map((c, i) => (
                <li key={c.clause_id} className="flex gap-2">
                  <span className="text-muted-foreground">{i + 1}.</span>
                  <span>{c.title}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">
              Every clause is reviewed against IEA templates. The AI selects
              and fills them — it never writes legal text.
            </p>
          </section>

          <AgreementOptionsForm
            action={generate}
            diplomaticApplicable={diplomaticApplicable}
            cancelHref={`/app/tenancies/${tenancy.id}`}
          />
        </div>
      )}
    </main>
  );
}
