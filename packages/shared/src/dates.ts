/**
 * The next date on or after `from` whose day-of-month is `paymentDay`.
 *
 * Rent is due on `payment_day` (1–28) each month; this finds the next
 * occurrence — today if it matches, otherwise this month, otherwise next
 * month. Compared at day granularity (time-of-day ignored). paymentDay is
 * constrained to 1–28 so every month has that day (no Feb-30 gaps).
 */
export function nextRentDueDate(paymentDay: number, from: Date = new Date()): Date {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const thisMonth = new Date(from.getFullYear(), from.getMonth(), paymentDay);
  if (thisMonth >= today) return thisMonth;
  return new Date(from.getFullYear(), from.getMonth() + 1, paymentDay);
}

/** Whole days from `from` to `to` (positive if `to` is in the future). */
export function daysUntil(to: Date, from: Date = new Date()): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}
