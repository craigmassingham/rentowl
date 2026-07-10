import { z } from "zod";

/**
 * Tenancy input validation (M1-W2-03).
 *
 * Tenant details live in the tenancies.prospective_tenant jsonb blob until
 * the tenant accepts an invite (M2) — no users row is created here.
 */

export const TENANCY_STATUSES = ["draft", "active", "ended", "terminated"] as const;

export const TENANCY_STATUS_LABELS: Record<(typeof TENANCY_STATUSES)[number], string> = {
  draft: "Draft",
  active: "Active",
  ended: "Ended",
  terminated: "Terminated",
};

/**
 * Normalizes an SG phone number to +65XXXXXXXX.
 * Accepts "9123 4567", "+65 9123 4567", "+6591234567" etc.
 * Returns null when it isn't a valid SG number.
 */
export function normalizeSGPhone(input: string): string | null {
  const digits = input.replace(/[\s-]/g, "");
  const match = /^(?:\+65)?([3689]\d{7})$/.exec(digits);
  return match ? `+65${match[1]}` : null;
}

const sgPhone = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const normalized = normalizeSGPhone(v);
    if (!normalized) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a Singapore phone number, e.g. +65 9123 4567.",
      });
      return z.NEVER;
    }
    return normalized;
  });

const sgd = (message: string) =>
  z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? null : Number(v)),
    z.number(message)
  );

export const TenancyInputSchema = z
  .object({
    tenant_name: z.string().trim().min(1, "Enter the tenant's full name."),
    tenant_email: z.email("Enter a valid email address."),
    tenant_phone: sgPhone,
    start_date: z.iso.date("Pick a start date."),
    end_date: z.iso.date("Pick an end date."),
    monthly_rent_sgd: sgd("Enter the monthly rent.").pipe(
      z.number().positive("Rent must be more than S$0.")
    ),
    deposit_sgd: z.preprocess(
      (v) => (v === "" || v === undefined || v === null ? 0 : Number(v)),
      z.number("Enter the deposit, or leave it blank for none.").min(
        0,
        "Deposit can't be negative."
      )
    ),
    payment_day: z.preprocess(
      (v) => (v === "" || v === undefined || v === null ? null : Number(v)),
      z
        .number("Choose the day rent is due.")
        .int()
        .min(1, "Payment day must be between 1 and 28.")
        .max(28, "Payment day must be between 1 and 28.")
    ),
    status: z.enum(TENANCY_STATUSES).optional(),
  })
  .refine((data) => data.end_date > data.start_date, {
    message: "End date must be after the start date.",
    path: ["end_date"],
  });

export type TenancyInput = z.infer<typeof TenancyInputSchema>;

/** Shape of the tenancies.prospective_tenant jsonb blob. */
export const ProspectiveTenantSchema = z.object({
  full_name: z.string(),
  email: z.string(),
  phone: z.string(),
});

export type ProspectiveTenant = z.infer<typeof ProspectiveTenantSchema>;
