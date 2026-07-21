import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createPropertyForOnboarding } from "../properties/actions";
import { createTenancyForOnboarding } from "../tenancies/actions";
import { generateAgreement } from "../tenancies/[id]/agreement/actions";
import { PropertyForm } from "../properties/property-form";
import { TenancyForm } from "../tenancies/tenancy-form";
import { AgreementOptionsForm } from "../tenancies/[id]/agreement/new/agreement-options-form";
import { OnboardingStepper, type OnboardingStep } from "./onboarding-stepper";

export const metadata: Metadata = { title: "Get set up — RentOwl" };

const COPY: Record<OnboardingStep, { title: string; subtitle: string }> = {
  property: {
    title: "Add your property",
    subtitle:
      "Start with the address. You can add more properties later from the dashboard.",
  },
  tenancy: {
    title: "Add the tenancy",
    subtitle: "Who's renting, for how long, and the rent and deposit.",
  },
  agreement: {
    title: "Generate the agreement",
    subtitle:
      "RentOwl assembles a Singapore-standard tenancy agreement you can download and sign.",
  },
};

/**
 * One resumable onboarding flow (M1-W4-01): property → tenancy → agreement.
 * The step is derived from what the landlord has already saved, so leaving
 * and returning picks up where they left off ("save and come back").
 */
export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Most-recent property, and whether its latest tenancy has an agreement.
  const { data: property } = await supabase
    .from("properties")
    .select("id, property_type")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let step: OnboardingStep = "property";
  let tenancyId: string | null = null;
  let diplomaticApplicable = false;

  if (property) {
    diplomaticApplicable = property.property_type !== "hdb";
    const { data: tenancy } = await supabase
      .from("tenancies")
      .select("id")
      .eq("property_id", property.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!tenancy) {
      step = "tenancy";
    } else {
      tenancyId = tenancy.id;
      const { data: agreement } = await supabase
        .from("tenancy_agreements")
        .select("id")
        .eq("tenancy_id", tenancy.id)
        .limit(1)
        .maybeSingle();
      // Everything set up already — onboarding is complete.
      if (agreement) redirect("/app/dashboard");
      step = "agreement";
    }
  }

  const copy = COPY[step];

  return (
    <main className="mx-auto max-w-2xl">
      <p className="text-sm font-medium text-muted-foreground">Get set up</p>
      <div className="mt-3">
        <OnboardingStepper current={step} />
      </div>

      <h1 className="mt-8 text-2xl font-semibold tracking-tight">{copy.title}</h1>
      <p className="mt-2 text-muted-foreground">{copy.subtitle}</p>

      <div className="mt-6">
        {step === "property" ? (
          <PropertyForm
            action={createPropertyForOnboarding}
            submitLabel="Save & continue"
            cancelHref="/app/dashboard"
            cancelLabel="Skip for now"
          />
        ) : null}

        {step === "tenancy" && property ? (
          <TenancyForm
            action={createTenancyForOnboarding.bind(null, property.id)}
            submitLabel="Save & continue"
            cancelHref="/app/dashboard"
            cancelLabel="Skip for now"
          />
        ) : null}

        {step === "agreement" && tenancyId ? (
          <AgreementOptionsForm
            action={generateAgreement.bind(null, tenancyId)}
            diplomaticApplicable={diplomaticApplicable}
            cancelHref="/app/dashboard"
            cancelLabel="I'll generate this later"
          />
        ) : null}
      </div>

      {step !== "property" ? (
        <p className="mt-8 text-xs text-muted-foreground">
          Your progress is saved. You can leave and{" "}
          <Link href="/app/dashboard" className="underline underline-offset-4">
            come back to your dashboard
          </Link>{" "}
          any time.
        </p>
      ) : null}
    </main>
  );
}
