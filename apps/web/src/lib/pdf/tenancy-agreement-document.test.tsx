import { renderToBuffer } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";
import {
  TenancyAgreementDocument,
  type TenancyAgreementPdfData,
} from "./tenancy-agreement-document";

const data: TenancyAgreementPdfData = {
  version: 1,
  generatedAt: "21/07/2026",
  property: { address: "Blk 123 Bishan Street 13, #08-123, Singapore 570123", typeLabel: "HDB" },
  landlordName: "Alicia Wong",
  tenantNames: ["Sarah Tan", "Dev Raman"],
  term: {
    startDate: "01/08/2026",
    endDate: "31/07/2027",
    monthlyRent: "S$3,200",
    deposit: "S$3,200",
  },
  clauses: [
    {
      clause_id: "rent-and-payment",
      title: "Rent and Payment",
      body: "The rent is **S$3,200** per calendar month.\n\n1. Payable in advance.\n2. Due on day 1 of each month.",
    },
  ],
};

describe("TenancyAgreementDocument", () => {
  it("renders a valid PDF buffer", async () => {
    const buffer = await renderToBuffer(<TenancyAgreementDocument data={data} />);
    expect(buffer.length).toBeGreaterThan(1000);
    // PDF magic bytes
    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });
});
