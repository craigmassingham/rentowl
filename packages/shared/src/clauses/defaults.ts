/**
 * Default values for clause template variables. Values are pre-formatted
 * strings — the clause layer never formats currency or dates.
 */
export const CLAUSE_VARIABLE_DEFAULTS: Readonly<Record<string, string>> = {
  // Minor Repair Clause threshold (M1-W3-01: configurable, default S$200)
  minor_repair_threshold_sgd: "S$200",
  // Diplomatic clause conventions: exercisable after 12 months, 2 months' notice
  diplomatic_min_stay_months: "twelve (12)",
  diplomatic_notice_months: "two (2)",
};
