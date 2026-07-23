"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PropertyInputSchema, type PropertyInput } from "@rentowl/shared";
import { createClient } from "@/lib/supabase/server";

export type PropertyActionState = {
  /** Field-level errors keyed by input name; "form" for cross-field/server errors. */
  errors: Record<string, string>;
} | null;

function parseInput(formData: FormData): {
  values?: PropertyInput;
  errors?: Record<string, string>;
} {
  const raw = Object.fromEntries(formData.entries());
  const result = PropertyInputSchema.safeParse(raw);
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

/** Auth + validate + insert. Returns the new id, or field errors. No redirect. */
async function insertProperty(
  formData: FormData
): Promise<{ id: string } | { errors: Record<string, string> }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { values, errors } = parseInput(formData);
  if (errors) return { errors };

  const { data, error } = await supabase
    .from("properties")
    .insert({ ...values!, owner_id: user.id })
    .select("id")
    .single();

  if (error) {
    console.error("[properties] insert failed", error);
    return {
      errors: {
        form: "We couldn't save this property. Check your connection and try again.",
      },
    };
  }

  return { id: data.id };
}

export async function createProperty(
  _prev: PropertyActionState,
  formData: FormData
): Promise<PropertyActionState> {
  const result = await insertProperty(formData);
  if ("errors" in result) return { errors: result.errors };
  revalidatePath("/app/properties");
  redirect(`/app/properties/${result.id}`);
}

/** Onboarding variant: same insert, returns to the onboarding flow to advance. */
export async function createPropertyForOnboarding(
  _prev: PropertyActionState,
  formData: FormData
): Promise<PropertyActionState> {
  const result = await insertProperty(formData);
  if ("errors" in result) return { errors: result.errors };
  revalidatePath("/app/properties");
  redirect("/app/onboarding");
}

export async function updateProperty(
  propertyId: string,
  _prev: PropertyActionState,
  formData: FormData
): Promise<PropertyActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { values, errors } = parseInput(formData);
  if (errors) return { errors };

  // RLS scopes the update to the owner's rows; zero rows means not yours/not found.
  const { data, error } = await supabase
    .from("properties")
    .update(values!)
    .eq("id", propertyId)
    .select("id");

  if (error || data.length === 0) {
    if (error) console.error("[properties] update failed", error);
    return {
      errors: {
        form: "We couldn't update this property. It may have been deleted — go back to Properties and try again.",
      },
    };
  }

  revalidatePath("/app/properties");
  revalidatePath(`/app/properties/${propertyId}`);
  redirect(`/app/properties/${propertyId}`);
}

export async function deleteProperty(propertyId: string): Promise<{ error: string } | never> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("properties")
    .delete()
    .eq("id", propertyId)
    .select("id");

  if (error) {
    // FK restrict: properties with tenancies can't be hard-deleted (no cascades on user data).
    if (error.code === "23503") {
      return {
        error:
          "This property has tenancies attached, so it can't be deleted. End or remove its tenancies first.",
      };
    }
    console.error("[properties] delete failed", error);
    return {
      error: "We couldn't delete this property. Check your connection and try again.",
    };
  }
  if (data.length === 0) {
    return {
      error: "This property no longer exists. Go back to Properties to see your current list.",
    };
  }

  revalidatePath("/app/properties");
  redirect("/app/properties");
}
