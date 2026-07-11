import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  MODELS,
  estimateCostUsd,
  getAnthropicClient,
  zodOutputFormat,
} from "@rentowl/integrations/anthropic";
import { PROPERTY_TYPES, formatDate, formatSGD } from "@rentowl/shared";
import {
  getClauseLibrary,
  substituteVariables,
  type Clause,
} from "@rentowl/shared/clauses";
import { logPromptCall } from "../shared/logging";

export const PROMPT_KEY = "tenancy-agreements/generate";
export const PROMPT_VERSION = "1.0.0";

const here = dirname(fileURLToPath(import.meta.url));
const systemPrompt = readFileSync(join(here, "generate.system.md"), "utf8");

// ── Input ───────────────────────────────────────────────────────────

export const GenerateTAInputSchema = z.object({
  property: z.object({
    property_type: z.enum(PROPERTY_TYPES),
    address: z.string().min(1),
    /** Room-only rental of part of the unit (M1 supports it via flags only). */
    room_rental: z.boolean().default(false),
  }),
  tenancy: z.object({
    landlord_name: z.string().min(1),
    tenant_names: z.array(z.string().min(1)).min(1),
    agreement_date: z.iso.date(),
    start_date: z.iso.date(),
    end_date: z.iso.date(),
    monthly_rent_sgd: z.number().positive(),
    deposit_sgd: z.number().min(0),
    payment_day: z.number().int().min(1).max(28),
  }),
  clause_options: z.object({
    include_diplomatic: z.boolean().default(false),
    minor_repair_threshold_sgd: z.number().positive().optional(),
  }),
});

export type GenerateTAInput = z.infer<typeof GenerateTAInputSchema>;

// ── Model output (structured; records unsupported, so name/value pairs) ──

const ModelOutputSchema = z.object({
  clauses: z.array(
    z.object({
      clause_id: z.string(),
      version: z.string(),
      variables: z.array(z.object({ name: z.string(), value: z.string() })),
    })
  ),
  flags: z.array(
    z.object({
      clause_id: z.string().nullable(),
      issue: z.string(),
      suggestion: z.string(),
    })
  ),
  metadata: z.object({
    generatedFor: z.string(),
    templateVersion: z.string(),
  }),
});

// ── Result ──────────────────────────────────────────────────────────

export interface AssembledClause {
  clause_id: string;
  version: string;
  title: string;
  /** Library body with every variable substituted — the legal text. */
  body: string;
  variables: Record<string, string>;
}

export interface GenerateTAResult {
  clauses: AssembledClause[];
  flags: { clause_id: string | null; issue: string; suggestion: string }[];
  metadata: { generatedFor: string; templateVersion: string };
  usage: { input_tokens: number; output_tokens: number; cost_usd: number | null };
}

// ── Deterministic pre-computation (formatting never goes to the model) ──

function monthsBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso);
  const end = new Date(endIso);
  return Math.round(
    (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth()) +
      (end.getDate() >= start.getDate() ? 1 : 0)
  );
}

function computeVariables(input: GenerateTAInput): Record<string, string> {
  const { tenancy, property, clause_options } = input;
  return {
    agreement_date: formatDate(tenancy.agreement_date),
    landlord_name: tenancy.landlord_name,
    tenant_name: tenancy.tenant_names.join(" and "),
    property_address: property.address,
    term_months: String(monthsBetween(tenancy.start_date, tenancy.end_date)),
    start_date: formatDate(tenancy.start_date),
    end_date: formatDate(tenancy.end_date),
    monthly_rent_sgd: formatSGD(tenancy.monthly_rent_sgd),
    deposit_sgd: formatSGD(tenancy.deposit_sgd),
    payment_day: String(tenancy.payment_day),
    ...(clause_options.minor_repair_threshold_sgd
      ? { minor_repair_threshold_sgd: formatSGD(clause_options.minor_repair_threshold_sgd) }
      : {}),
  };
}

/** The clause_ids that MUST be selected for this input — code-derived, not model-trusted. */
function expectedClauseIds(input: GenerateTAInput, library: Clause[]): string[] {
  return library
    .filter((clause) => {
      if (!clause.applicability.includes(input.property.property_type)) return false;
      if (clause.required) return true;
      return (
        clause.clause_id === "diplomatic" && input.clause_options.include_diplomatic
      );
    })
    .map((clause) => clause.clause_id);
}

class TAAssemblyError extends Error {
  constructor(message: string) {
    super(`Tenancy agreement assembly failed: ${message}`);
    this.name = "TAAssemblyError";
  }
}

// ── Main ────────────────────────────────────────────────────────────

/**
 * Assembles a TA from tenancy data + clause selections (M1-W3-02).
 *
 * The model selects clauses, fills variables, and flags concerns. It never
 * emits clause text: bodies are re-rendered here from the reviewed library
 * via substituteVariables, and the selection is verified against the
 * code-derived expectation — a wrong selection throws rather than shipping.
 */
export async function generateTenancyAgreement(
  rawInput: GenerateTAInput
): Promise<GenerateTAResult> {
  const input = GenerateTAInputSchema.parse(rawInput);
  const library = getClauseLibrary();
  const computedVariables = computeVariables(input);
  const model = MODELS.legal;
  const startedAt = Date.now();

  const client = getAnthropicClient();
  const response = await client.messages.parse({
    model,
    max_tokens: 8000,
    system: systemPrompt,
    output_config: { format: zodOutputFormat(ModelOutputSchema) },
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          clause_library: library.map((c) => ({
            clause_id: c.clause_id,
            version: c.version,
            title: c.title,
            applicability: c.applicability,
            required: c.required,
            variables: c.variables,
            body: c.body,
          })),
          property: input.property,
          tenancy: input.tenancy,
          clause_options: input.clause_options,
          computed_variables: computedVariables,
        }),
      },
    ],
  });

  const usage = {
    input_tokens: response.usage.input_tokens,
    output_tokens: response.usage.output_tokens,
  };
  const costUsd = estimateCostUsd(model, usage);

  try {
    if (response.parsed_output == null) {
      throw new TAAssemblyError("model output did not match the schema");
    }
    const output = ModelOutputSchema.parse(response.parsed_output);

    // Verify the selection against the code-derived expectation.
    const expected = expectedClauseIds(input, library);
    const selected = output.clauses.map((c) => c.clause_id);
    if (JSON.stringify(selected) !== JSON.stringify(expected)) {
      throw new TAAssemblyError(
        `clause selection mismatch — expected [${expected.join(", ")}], got [${selected.join(", ")}]`
      );
    }

    const byId = new Map(library.map((c) => [c.clause_id, c]));
    const clauses: AssembledClause[] = output.clauses.map((selection) => {
      const clause = byId.get(selection.clause_id)!;
      if (clause.version !== selection.version) {
        throw new TAAssemblyError(
          `${selection.clause_id}: version ${selection.version} doesn't match library ${clause.version}`
        );
      }
      const variables = Object.fromEntries(
        selection.variables.map(({ name, value }) => [name, value])
      );
      // Throws MissingClauseVariablesError if the model skipped a variable.
      const body = substituteVariables(clause, variables);
      return {
        clause_id: clause.clause_id,
        version: clause.version,
        title: clause.title,
        body,
        variables,
      };
    });

    const result: GenerateTAResult = {
      clauses,
      flags: output.flags,
      metadata: output.metadata,
      usage: { ...usage, cost_usd: costUsd },
    };

    await logPromptCall({
      promptKey: PROMPT_KEY,
      promptVersion: PROMPT_VERSION,
      model,
      input,
      output,
      usage,
      costUsd,
      durationMs: Date.now() - startedAt,
    });

    return result;
  } catch (error) {
    await logPromptCall({
      promptKey: PROMPT_KEY,
      promptVersion: PROMPT_VERSION,
      model,
      input,
      usage,
      costUsd,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
