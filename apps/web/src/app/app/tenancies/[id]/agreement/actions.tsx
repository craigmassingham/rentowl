"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  PROPERTY_TYPE_LABELS,
  ProspectiveTenantSchema,
  formatDate,
  formatSGD,
  toISODate,
} from "@rentowl/shared";
import {
  generateTenancyAgreement,
  type GenerateTAResult,
} from "@rentowl/prompts/tenancy-agreements/generate";
import type { Json } from "@rentowl/db";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  TenancyAgreementDocument,
  type TenancyAgreementPdfData,
} from "@/lib/pdf/tenancy-agreement-document";

const BUCKET = "tenancy-agreements";

export type AgreementActionState = { error: string } | null;

/** Everything the stored agreement needs to re-render its preview offline. */
export interface StoredAgreementClauses {
  clauses: GenerateTAResult["clauses"];
  flags: GenerateTAResult["flags"];
  metadata: GenerateTAResult["metadata"];
}

function composeAddress(property: {
  address_line_1: string;
  address_line_2: string | null;
  postal_code: string;
}): string {
  const unit = property.address_line_2 ? `, ${property.address_line_2}` : "";
  return `${property.address_line_1}${unit}, Singapore ${property.postal_code}`;
}

export async function generateAgreement(
  tenancyId: string,
  _prev: AgreementActionState,
  formData: FormData
): Promise<AgreementActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS scopes this to the owner; anyone else gets no row.
  const { data: tenancy } = await supabase
    .from("tenancies")
    .select(
      "*, properties (property_type, address_line_1, address_line_2, postal_code)"
    )
    .eq("id", tenancyId)
    .maybeSingle();

  if (!tenancy || !tenancy.properties) {
    return { error: "This tenancy no longer exists. Go back and try again." };
  }

  const tenantParse = ProspectiveTenantSchema.safeParse(tenancy.prospective_tenant);
  if (!tenantParse.success) {
    return {
      error:
        "This tenancy has no tenant details yet. Add the tenant on the tenancy before generating an agreement.",
    };
  }

  const { data: profile } = await supabase
    .from("users_profile")
    .select("full_name")
    .eq("id", user.id)
    .single();
  const landlordName = profile?.full_name?.trim() || "The Landlord";

  const includeDiplomatic = formData.get("include_diplomatic") === "on";
  const roomRental = formData.get("room_rental") === "on";
  const thresholdRaw = formData.get("minor_repair_threshold_sgd");
  const threshold =
    typeof thresholdRaw === "string" && thresholdRaw.trim() !== ""
      ? Number(thresholdRaw)
      : undefined;
  if (threshold !== undefined && (!Number.isFinite(threshold) || threshold <= 0)) {
    return { error: "Minor repair threshold must be a positive amount." };
  }

  const property = tenancy.properties;

  let result: GenerateTAResult;
  try {
    result = await generateTenancyAgreement({
      property: {
        property_type: property.property_type,
        address: composeAddress(property),
        room_rental: roomRental,
      },
      tenancy: {
        landlord_name: landlordName,
        tenant_names: [tenantParse.data.full_name],
        agreement_date: toISODate(new Date()),
        start_date: tenancy.start_date,
        end_date: tenancy.end_date,
        monthly_rent_sgd: Number(tenancy.monthly_rent_sgd),
        deposit_sgd: Number(tenancy.deposit_sgd),
        payment_day: tenancy.payment_day,
      },
      clause_options: {
        include_diplomatic: includeDiplomatic,
        ...(threshold !== undefined ? { minor_repair_threshold_sgd: threshold } : {}),
      },
    });
  } catch (err) {
    // The generator throws on selection/variable mismatches (defence in depth)
    // and on API failure. Either way the landlord can retry.
    console.error("[agreement] generateTenancyAgreement failed", err);
    return {
      error:
        "We couldn't generate the agreement. Try again — if it keeps failing, the AI service may be down.",
    };
  }

  // Next version for this tenancy (unique(tenancy_id, version) guards races).
  const { data: latest } = await supabase
    .from("tenancy_agreements")
    .select("version")
    .eq("tenancy_id", tenancyId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const version = (latest?.version ?? 0) + 1;

  const pdfData: TenancyAgreementPdfData = {
    version,
    generatedAt: formatDate(new Date()),
    property: {
      address: composeAddress(property),
      typeLabel: PROPERTY_TYPE_LABELS[property.property_type],
    },
    landlordName,
    tenantNames: [tenantParse.data.full_name],
    term: {
      startDate: formatDate(tenancy.start_date),
      endDate: formatDate(tenancy.end_date),
      monthlyRent: formatSGD(Number(tenancy.monthly_rent_sgd)),
      deposit: formatSGD(Number(tenancy.deposit_sgd)),
    },
    clauses: result.clauses.map((c) => ({
      clause_id: c.clause_id,
      title: c.title,
      body: c.body,
    })),
  };

  const pdfBuffer = await renderToBuffer(<TenancyAgreementDocument data={pdfData} />);
  const storagePath = `${tenancyId}/v${version}.pdf`;

  // Upload with the service-role client — the bucket is private and the
  // browser never touches it (writes and reads both go through the server).
  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (uploadError) {
    console.error("[agreement] PDF upload failed", uploadError);
    return {
      error: "We generated the agreement but couldn't save the PDF. Try again.",
    };
  }

  const stored: StoredAgreementClauses = {
    clauses: result.clauses,
    flags: result.flags,
    metadata: result.metadata,
  };

  // Insert via the RLS-scoped client (owner insert policy) — defence in depth.
  const { data: agreement, error: insertError } = await supabase
    .from("tenancy_agreements")
    .insert({
      tenancy_id: tenancyId,
      version,
      status: "draft",
      // StoredAgreementClauses is a plain JSON object; the generated Json type
      // doesn't accept interface types structurally, hence the cast.
      clauses: stored as unknown as Json,
      pdf_storage_path: storagePath,
    })
    .select("id")
    .single();

  if (insertError || !agreement) {
    if (insertError) console.error("[agreement] tenancy_agreements insert failed", insertError);
    return {
      error: "We generated the agreement but couldn't record it. Try again.",
    };
  }

  revalidatePath(`/app/tenancies/${tenancyId}`);
  redirect(`/app/tenancies/${tenancyId}/agreement/${agreement.id}`);
}
