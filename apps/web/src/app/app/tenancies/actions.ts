"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { TenancyInputSchema, type TenancyInput } from "@rentowl/shared";
import { createClient } from "@/lib/supabase/server";

export type TenancyActionState = {
  /** Field-level errors keyed by input name; "form" for cross-field/server errors. */
  errors: Record<string, string>;
} | null;

const OVERLAP_ERROR =
  "This property already has an active tenancy overlapping those dates. " +
  "End the current tenancy first, or adjust the dates.";

function parseInput(formData: FormData): {
  values?: TenancyInput;
  errors?: Record<string, string>;
} {
  const raw = Object.fromEntries(formData.entries());
  const result = TenancyInputSchema.safeParse(raw);
  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join(".") || "form";
      if (!(key in errors)) errors[key] = issue.message;
    }
    return { errors };
  }
  return { values: result.data };
}

function toRow(values: TenancyInput) {
  return {
    prospective_tenant: {
      full_name: values.tenant_name,
      email: values.tenant_email,
      phone: values.tenant_phone,
    },
    start_date: values.start_date,
    end_date: values.end_date,
    monthly_rent_sgd: values.monthly_rent_sgd,
    deposit_sgd: values.deposit_sgd,
    payment_day: values.payment_day,
  };
}

export async function createTenancy(
  propertyId: string,
  _prev: TenancyActionState,
  formData: FormData
): Promise<TenancyActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { values, errors } = parseInput(formData);
  if (errors) return { errors };

  // Landlords record the tenancy they already have, so it starts active.
  const { data, error } = await supabase
    .from("tenancies")
    .insert({ ...toRow(values!), property_id: propertyId, status: "active" })
    .select("id")
    .single();

  if (error) {
    // 23P01: the tenancies_no_active_overlap exclusion constraint (ADR-005)
    if (error.code === "23P01") {
      return { errors: { form: OVERLAP_ERROR } };
    }
    return {
      errors: {
        form: "We couldn't save this tenancy. Check your connection and try again.",
      },
    };
  }

  revalidatePath(`/app/properties/${propertyId}`);
  redirect(`/app/tenancies/${data.id}`);
}

export async function updateTenancy(
  tenancyId: string,
  _prev: TenancyActionState,
  formData: FormData
): Promise<TenancyActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { values, errors } = parseInput(formData);
  if (errors) return { errors };

  const { data, error } = await supabase
    .from("tenancies")
    .update({ ...toRow(values!), ...(values!.status ? { status: values!.status } : {}) })
    .eq("id", tenancyId)
    .select("id, property_id");

  if (error) {
    if (error.code === "23P01") {
      return { errors: { form: OVERLAP_ERROR } };
    }
    return {
      errors: {
        form: "We couldn't update this tenancy. Check your connection and try again.",
      },
    };
  }
  if (data.length === 0) {
    return {
      errors: {
        form: "This tenancy no longer exists. Go back to the property and try again.",
      },
    };
  }

  revalidatePath(`/app/properties/${data[0]!.property_id}`);
  revalidatePath(`/app/tenancies/${tenancyId}`);
  redirect(`/app/tenancies/${tenancyId}`);
}
