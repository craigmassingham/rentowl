import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import {
  generateTenancyAgreement,
  GenerateTAInputSchema,
  PROMPT_KEY,
  PROMPT_VERSION,
  type GenerateTAInput,
  type GenerateTAResult,
} from "./generate";

/**
 * Eval suite for tenancy-agreements/generate (M1-W3-02 acceptance).
 *
 * Requires ANTHROPIC_API_KEY (real Opus calls, ~S$0.06 per case) — set it in
 * apps/web/.env.local or the environment. Skips itself when absent.
 *
 * Robustness mode (acceptance: schema-valid across 20 random inputs):
 *   EVAL_ROBUSTNESS=20 pnpm --filter @rentowl/prompts eval
 */

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..");

// Minimal .env.local loader so evals run the same way E2E does, without
// adding a dotenv dependency.
const envLocal = join(repoRoot, "apps", "web", ".env.local");
if (existsSync(envLocal)) {
  for (const line of readFileSync(envLocal, "utf8").split("\n")) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match && !(match[1]! in process.env)) {
      process.env[match[1]!] = match[2]!;
    }
  }
}

const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);
const SGD_PER_USD = 1.35;
const MAX_COST_SGD = 0.3;

type EvalRecord = {
  name: string;
  passed: boolean;
  cost_sgd: number | null;
  usage: GenerateTAResult["usage"] | null;
  flags: GenerateTAResult["flags"] | null;
  error?: string;
};

const records: EvalRecord[] = [];

function baseTenancy() {
  return {
    landlord_name: "Alicia Wong",
    agreement_date: "2026-07-11",
    start_date: "2026-08-01",
    end_date: "2027-07-31",
    monthly_rent_sgd: 3200,
    deposit_sgd: 3200,
    payment_day: 1,
  };
}

async function runCase(name: string, input: GenerateTAInput): Promise<GenerateTAResult> {
  try {
    const result = await generateTenancyAgreement(input);
    const costSgd = result.usage.cost_usd != null ? result.usage.cost_usd * SGD_PER_USD : null;
    records.push({
      name,
      passed: true,
      cost_sgd: costSgd,
      usage: result.usage,
      flags: result.flags,
    });

    // Universal assertions (every case)
    expect(result.clauses.length).toBeGreaterThanOrEqual(10);
    for (const clause of result.clauses) {
      expect(clause.body).not.toMatch(/\{[a-z_]+\}/); // no unfilled placeholders
    }
    if (costSgd != null) {
      expect(costSgd).toBeLessThan(MAX_COST_SGD); // acceptance: < S$0.30
    }
    return result;
  } catch (error) {
    records.push({
      name,
      passed: false,
      cost_sgd: null,
      usage: null,
      flags: null,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

describe.skipIf(!hasKey)("tenancy-agreements/generate evals", () => {
  afterAll(() => {
    const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    const outDir = join(repoRoot, "docs", "prompts", "evals");
    mkdirSync(outDir, { recursive: true });
    const outPath = join(outDir, `${stamp}-tenancy-agreements-generate.json`);
    writeFileSync(
      outPath,
      JSON.stringify(
        {
          prompt_key: PROMPT_KEY,
          prompt_version: PROMPT_VERSION,
          run_at: new Date().toISOString(),
          cases: records,
        },
        null,
        2
      )
    );
    console.log(`Eval results written to ${outPath}`);
  });

  it("1. HDB, 1-year tenancy, no diplomatic clause", async () => {
    const result = await runCase("hdb-1yr-no-diplomatic", {
      property: {
        property_type: "hdb",
        address: "Blk 123 Bishan Street 13, #08-123, Singapore 570123",
        room_rental: false,
      },
      tenancy: { ...baseTenancy(), tenant_names: ["Sarah Tan"] },
      clause_options: { include_diplomatic: false },
    });

    const ids = result.clauses.map((c) => c.clause_id);
    expect(ids).not.toContain("diplomatic");
    expect(ids).toContain("parties-and-property");
    expect(ids).toContain("governing-law");
    expect(result.clauses.find((c) => c.clause_id === "term")!.body).toContain("12 months");
    expect(result.clauses.find((c) => c.clause_id === "rent-and-payment")!.body).toContain(
      "S$3,200"
    );
  });

  it("2. Condo, 2-year tenancy, with diplomatic clause", async () => {
    const result = await runCase("condo-2yr-diplomatic", {
      property: {
        property_type: "condo",
        address: "8 Marina Boulevard, #23-05, Singapore 018981",
        room_rental: false,
      },
      tenancy: {
        ...baseTenancy(),
        tenant_names: ["James Okafor"],
        end_date: "2028-07-31",
        monthly_rent_sgd: 4500,
        deposit_sgd: 9000,
      },
      clause_options: { include_diplomatic: true },
    });

    const diplomatic = result.clauses.find((c) => c.clause_id === "diplomatic");
    expect(diplomatic).toBeDefined();
    expect(diplomatic!.body).toContain("twelve (12)"); // default min stay
    expect(result.clauses.find((c) => c.clause_id === "term")!.body).toContain("24 months");
  });

  it("3. Condo, expat tenant, custom minor repair threshold", async () => {
    const result = await runCase("condo-expat-custom-threshold", {
      property: {
        property_type: "condo",
        address: "1 Keppel Bay View, #10-11, Singapore 098417",
        room_rental: false,
      },
      tenancy: {
        ...baseTenancy(),
        tenant_names: ["Maria Fernandez"],
        monthly_rent_sgd: 5200,
        deposit_sgd: 10400,
      },
      clause_options: { include_diplomatic: true, minor_repair_threshold_sgd: 350 },
    });

    const minorRepair = result.clauses.find((c) => c.clause_id === "minor-repair");
    expect(minorRepair!.body).toContain("S$350");
    expect(minorRepair!.body).not.toContain("S$200");
  });

  it("4. Landed, 3-year tenancy, joint tenants", async () => {
    const result = await runCase("landed-3yr-joint-tenants", {
      property: {
        property_type: "landed",
        address: "27 Chestnut Crescent, Singapore 679359",
        room_rental: false,
      },
      tenancy: {
        ...baseTenancy(),
        tenant_names: ["Priya Raman", "Dev Raman"],
        end_date: "2029-07-31",
        monthly_rent_sgd: 8500,
        deposit_sgd: 17000,
      },
      clause_options: { include_diplomatic: false },
    });

    const parties = result.clauses.find((c) => c.clause_id === "parties-and-property");
    expect(parties!.body).toContain("Priya Raman");
    expect(parties!.body).toContain("Dev Raman");
    expect(result.clauses.find((c) => c.clause_id === "term")!.body).toContain("36 months");
  });

  it("5. HDB, room-rental only (not full unit)", async () => {
    const result = await runCase("hdb-room-rental", {
      property: {
        property_type: "hdb",
        address: "Blk 456 Tampines Avenue 9, #12-456, Singapore 520456 (master bedroom)",
        room_rental: true,
      },
      tenancy: {
        ...baseTenancy(),
        tenant_names: ["Wei Lin Chua"],
        monthly_rent_sgd: 1400,
        deposit_sgd: 1400,
      },
      clause_options: { include_diplomatic: false },
    });

    // The library assumes whole-unit lets; a room rental must be flagged.
    expect(result.flags.length).toBeGreaterThan(0);
    const flagText = result.flags.map((f) => `${f.issue} ${f.suggestion}`).join(" ").toLowerCase();
    expect(flagText).toContain("room");
  });
});

// ── Robustness: output validates across N random inputs (acceptance) ──

const robustnessRuns = Number(process.env.EVAL_ROBUSTNESS ?? 0);

function randomInput(seed: number): GenerateTAInput {
  const types = ["hdb", "condo", "landed"] as const;
  const type = types[seed % 3]!;
  const startMonth = (seed % 12) + 1;
  const years = (seed % 3) + 1;
  const names = [["Tan Ah Kow"], ["Nur Aisyah"], ["John Smith", "Jane Smith"]][seed % 3]!;
  return GenerateTAInputSchema.parse({
    property: {
      property_type: type,
      address: `Blk ${100 + seed} Example Street ${seed}, #0${(seed % 9) + 1}-${100 + seed}, Singapore ${String(560000 + seed).slice(0, 6)}`,
      room_rental: false,
    },
    tenancy: {
      landlord_name: "Alicia Wong",
      tenant_names: names,
      agreement_date: "2026-07-11",
      start_date: `2026-${String(startMonth).padStart(2, "0")}-01`,
      end_date: `${2026 + years}-${String(startMonth).padStart(2, "0")}-01`,
      monthly_rent_sgd: 1500 + seed * 137,
      deposit_sgd: seed % 4 === 0 ? 0 : 1500 + seed * 137,
      payment_day: (seed % 28) + 1,
    },
    clause_options: {
      include_diplomatic: type !== "hdb" && seed % 2 === 0,
      ...(seed % 5 === 0 ? { minor_repair_threshold_sgd: 150 + seed * 10 } : {}),
    },
  });
}

describe.skipIf(!hasKey || robustnessRuns === 0)("robustness — random inputs", () => {
  it(`output validates across ${robustnessRuns} random inputs`, async () => {
    for (let i = 0; i < robustnessRuns; i++) {
      // generateTenancyAgreement throws on any schema/selection/variable
      // failure, so completing the loop is the assertion.
      const result = await generateTenancyAgreement(randomInput(i));
      expect(result.clauses.length).toBeGreaterThanOrEqual(10);
    }
  });
});
