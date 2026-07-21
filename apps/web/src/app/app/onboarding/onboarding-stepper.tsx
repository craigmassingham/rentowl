import { cn } from "@rentowl/ui";

export type OnboardingStep = "property" | "tenancy" | "agreement";

const STEPS: { id: OnboardingStep; label: string }[] = [
  { id: "property", label: "Property" },
  { id: "tenancy", label: "Tenancy" },
  { id: "agreement", label: "Agreement" },
];

/** Progress indicator across the three onboarding steps. */
export function OnboardingStepper({ current }: { current: OnboardingStep }) {
  const currentIndex = STEPS.findIndex((s) => s.id === current);

  return (
    <ol className="flex items-center gap-2" aria-label="Setup progress">
      {STEPS.map((step, i) => {
        const state =
          i < currentIndex ? "done" : i === currentIndex ? "current" : "upcoming";
        return (
          <li key={step.id} className="flex flex-1 items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                  state === "done" && "border-primary bg-primary text-primary-foreground",
                  state === "current" && "border-primary text-primary",
                  state === "upcoming" && "border-muted-foreground/30 text-muted-foreground"
                )}
                aria-current={state === "current" ? "step" : undefined}
              >
                {state === "done" ? "✓" : i + 1}
              </span>
              <span
                className={cn(
                  "text-sm font-medium",
                  state === "upcoming" ? "text-muted-foreground" : "text-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 ? (
              <span
                className={cn(
                  "h-px flex-1",
                  i < currentIndex ? "bg-primary" : "bg-border"
                )}
                aria-hidden
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
