const sgdFormatter = new Intl.NumberFormat("en-SG", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

/** Formats an amount as "S$1,234" or "S$1,234.50" — never "$1234" or "SGD 1234". */
export function formatSGD(amount: number): string {
  return `S$${sgdFormatter.format(amount)}`;
}

/** Formats a date as DD/MM/YYYY — the only date format used in RentOwl UI. */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

/** SG postal codes are exactly 6 digits. */
export function isValidSGPostalCode(postal: string): boolean {
  return /^\d{6}$/.test(postal);
}

/**
 * Formats a Date as an ISO yyyy-mm-dd string using local date parts —
 * unlike toISOString(), never shifts the day across the UTC boundary.
 */
export function toISODate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
