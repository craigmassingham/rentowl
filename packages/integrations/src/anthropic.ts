import Anthropic from "@anthropic-ai/sdk";

/**
 * Typed wrapper for the Anthropic API (ARCHITECTURE §5).
 * Rule: no Anthropic calls outside this module's client — every prompt in
 * @rentowl/prompts goes through getAnthropicClient().
 *
 * Model policy (CLAUDE.md §5): Opus for legal document generation,
 * Sonnet for triage and reminders.
 */

export const MODELS = {
  /** Legal document generation — precision justifies the cost. */
  legal: "claude-opus-4-8",
  /** Triage, reminders, and other operational prompts. */
  operational: "claude-sonnet-5",
} as const;

/** USD per million tokens, keyed by model. Update when pricing changes. */
const PRICING_USD_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 3, output: 15 },
};

let client: Anthropic | null = null;

/** Singleton Anthropic client. Requires ANTHROPIC_API_KEY (server-side only). */
export function getAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to apps/web/.env.local (dev) or the deployment secret manager."
    );
  }
  client ??= new Anthropic();
  return client;
}

/** Estimated cost in USD for a completed call, from response usage. */
export function estimateCostUsd(
  model: string,
  usage: { input_tokens: number; output_tokens: number }
): number | null {
  const pricing = PRICING_USD_PER_MTOK[model];
  if (!pricing) return null;
  return (
    (usage.input_tokens * pricing.input + usage.output_tokens * pricing.output) /
    1_000_000
  );
}

export type { Anthropic };

// Structured-outputs helper, re-exported so prompt packages depend on this
// wrapper only — never on @anthropic-ai/sdk directly.
export { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
