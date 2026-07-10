import { z } from "zod";

/**
 * Property input validation (M1-W2-02).
 *
 * SG addresses are Block + Street, unit, and a 6-digit postal code — never a
 * single Google-style address field (CLAUDE.md §3, principle 3).
 */

export const PROPERTY_TYPES = ["hdb", "condo", "landed"] as const;

export const PROPERTY_TYPE_LABELS: Record<(typeof PROPERTY_TYPES)[number], string> = {
  hdb: "HDB",
  condo: "Condo",
  landed: "Landed",
};

/** Coerces "" from optional numeric form inputs to null. */
const optionalPositiveInt = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? null : Number(v)),
  z
    .number("Enter a whole number.")
    .int("Enter a whole number.")
    .min(0, "Can't be negative.")
    .nullable()
);

export const PropertyInputSchema = z.object({
  address_line_1: z
    .string()
    .trim()
    .min(1, "Enter the block and street, e.g. Blk 123 Bishan Street 13."),
  address_line_2: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  postal_code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Postal code must be exactly 6 digits."),
  property_type: z.enum(PROPERTY_TYPES, "Choose a property type."),
  bedrooms: optionalPositiveInt,
  bathrooms: optionalPositiveInt,
  floor_area_sqft: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? null : Number(v)),
    z
      .number("Enter a whole number of square feet.")
      .int("Enter a whole number of square feet.")
      .positive("Floor area must be more than 0 sqft.")
      .nullable()
  ),
  notes: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable(),
});

export type PropertyInput = z.infer<typeof PropertyInputSchema>;
