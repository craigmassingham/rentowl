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
