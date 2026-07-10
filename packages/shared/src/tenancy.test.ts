import { describe, expect, it } from "vitest";
import { TenancyInputSchema, normalizeSGPhone } from "./tenancy";

const validInput = {
  tenant_name: "Sarah Tan",
  tenant_email: "sarah.tan@example.com",
  tenant_phone: "9123 4567",
  start_date: "2026-08-01",
  end_date: "2027-07-31",
  monthly_rent_sgd: "3200",
  deposit_sgd: "3200",
  payment_day: "1",
};

describe("normalizeSGPhone", () => {
  it("normalizes local and international formats to +65XXXXXXXX", () => {
    expect(normalizeSGPhone("9123 4567")).toBe("+6591234567");
    expect(normalizeSGPhone("+65 9123-4567")).toBe("+6591234567");
    expect(normalizeSGPhone("+6561234567")).toBe("+6561234567");
  });

  it("rejects non-SG numbers", () => {
    expect(normalizeSGPhone("12345678")).toBeNull(); // SG numbers start 3/6/8/9
    expect(normalizeSGPhone("+44 20 7946 0958")).toBeNull();
    expect(normalizeSGPhone("9123")).toBeNull();
  });
});

describe("TenancyInputSchema", () => {
  it("accepts a valid tenancy and coerces numerics", () => {
    const result = TenancyInputSchema.parse(validInput);
    expect(result.tenant_phone).toBe("+6591234567");
    expect(result.monthly_rent_sgd).toBe(3200);
    expect(result.deposit_sgd).toBe(3200);
    expect(result.payment_day).toBe(1);
  });

  it("rejects end date before start date", () => {
    const result = TenancyInputSchema.safeParse({
      ...validInput,
      end_date: "2026-07-01",
    });
    expect(result.success).toBe(false);
    expect(result.error!.issues[0]!.message).toBe(
      "End date must be after the start date."
    );
  });

  it("rejects zero rent", () => {
    const result = TenancyInputSchema.safeParse({
      ...validInput,
      monthly_rent_sgd: "0",
    });
    expect(result.success).toBe(false);
  });

  it("treats a blank deposit as 0 but rejects negative", () => {
    expect(TenancyInputSchema.parse({ ...validInput, deposit_sgd: "" }).deposit_sgd).toBe(0);
    expect(
      TenancyInputSchema.safeParse({ ...validInput, deposit_sgd: "-1" }).success
    ).toBe(false);
  });

  it("rejects payment day outside 1–28", () => {
    expect(TenancyInputSchema.safeParse({ ...validInput, payment_day: "29" }).success).toBe(false);
    expect(TenancyInputSchema.safeParse({ ...validInput, payment_day: "0" }).success).toBe(false);
  });
});
