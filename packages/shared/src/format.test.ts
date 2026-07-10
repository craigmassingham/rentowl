import { describe, expect, it } from "vitest";
import { formatSGD, formatDate, isValidSGPostalCode } from "./format";

describe("formatSGD", () => {
  it("formats whole amounts with thousands separator", () => {
    expect(formatSGD(1234)).toBe("S$1,234");
  });

  it("formats cents when present", () => {
    expect(formatSGD(1234.5)).toBe("S$1,234.5");
  });

  it("formats zero", () => {
    expect(formatSGD(0)).toBe("S$0");
  });
});

describe("formatDate", () => {
  it("formats as DD/MM/YYYY", () => {
    expect(formatDate(new Date(2026, 3, 25))).toBe("25/04/2026");
  });

  it("pads single-digit day and month", () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe("05/01/2026");
  });
});

describe("isValidSGPostalCode", () => {
  it("accepts 6 digits", () => {
    expect(isValidSGPostalCode("049483")).toBe(true);
  });

  it("rejects wrong lengths and non-digits", () => {
    expect(isValidSGPostalCode("12345")).toBe(false);
    expect(isValidSGPostalCode("1234567")).toBe(false);
    expect(isValidSGPostalCode("04948a")).toBe(false);
  });
});
