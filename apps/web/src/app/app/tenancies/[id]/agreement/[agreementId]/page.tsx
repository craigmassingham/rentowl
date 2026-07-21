import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { formatDate } from "@rentowl/shared";
import { Button } from "@rentowl/ui";
import { createClient } from "@/lib/supabase/server";
import { ClauseBodyPreview } from "./agreement-preview";

export const metadata: Metadata = { title: "Tenancy agreement — RentOwl" };

const StoredClausesSchema = z.object({
  clauses: z.array(
    z.object({ clause_id: z.string(), title: z.string(), body: z.string() })
  ),
  flags: z.array(
    z.object({
      clause_id: z.string().nullable(),
      issue: z.string(),
      suggestion: z.string(),
    })
  ),
  metadata: z.object({ generatedFor: z.string(), templateVersion: z.string() }),
});

export default async function AgreementDetailPage({
  params,
}: {
  params: Promise<{ id: string; agreementId: string }>;
}) {
  const { id, agreementId } = await params;
  const supabase = await createClient();

  const { data: agreement } = await supabase
    .from("tenancy_agreements")
    .select("id, tenancy_id, version, status, clauses, generated_at")
    .eq("id", agreementId)
    .eq("tenancy_id", id)
    .maybeSingle();

  if (!agreement) {
    notFound();
  }

  const parsed = StoredClausesSchema.safeParse(agreement.clauses);
  if (!parsed.success) {
    notFound();
  }
  const { clauses, flags, metadata } = parsed.data;

  return (
    <main className="mx-auto max-w-4xl">
      <Link
        href={`/app/tenancies/${agreement.tenancy_id}`}
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Tenancy
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Tenancy agreement
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Version {agreement.version} · Generated {formatDate(agreement.generated_at)}
            {" · "}
            {metadata.generatedFor}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild>
            <a href={`/app/tenancies/${id}/agreement/${agreement.id}/download`}>
              Download PDF
            </a>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/app/tenancies/${id}/agreement/new`}>
              Generate new version
            </Link>
          </Button>
        </div>
      </div>

      {flags.length > 0 ? (
        <section className="mt-6 rounded-lg border border-warning/40 bg-warning/5 p-4">
          <h2 className="text-sm font-medium">
            {flags.length === 1 ? "1 thing to review" : `${flags.length} things to review`}
          </h2>
          <ul className="mt-2 grid gap-3 text-sm">
            {flags.map((flag, i) => (
              <li key={i}>
                <p>{flag.issue}</p>
                <p className="text-muted-foreground">{flag.suggestion}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-6 text-xs text-muted-foreground">
        Preview of the assembled agreement. The PDF adds a cover page and
        signature blocks. RentOwl is not a law firm — this is not legal advice.
      </p>

      <article className="mt-4 divide-y rounded-lg border">
        {clauses.map((clause) => (
          <section key={clause.clause_id} className="p-5">
            <h2 className="font-semibold">{clause.title}</h2>
            <ClauseBodyPreview body={clause.body} />
          </section>
        ))}
      </article>
    </main>
  );
}
