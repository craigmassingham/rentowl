import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

/**
 * Best-effort telemetry for AI calls → public.prompt_calls (ARCHITECTURE §7).
 * Never throws and never blocks the caller's result: a lost log line must not
 * fail a tenancy agreement generation.
 *
 * PDPA: raw inputs are hashed, never stored.
 */

export interface PromptCallLog {
  promptKey: string;
  promptVersion: string;
  model: string;
  input: unknown;
  output?: unknown;
  usage?: { input_tokens: number; output_tokens: number };
  costUsd?: number | null;
  durationMs?: number;
  error?: string;
}

export function hashInput(input: unknown): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export async function logPromptCall(log: PromptCallLog): Promise<void> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.warn(
      `[prompt-logging] Supabase env not configured — skipping log for ${log.promptKey}`
    );
    return;
  }

  try {
    const supabase = createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    });
    const { error } = await supabase.from("prompt_calls").insert({
      prompt_key: log.promptKey,
      prompt_version: log.promptVersion,
      model: log.model,
      input_hash: hashInput(log.input),
      output: log.output ?? null,
      usage: log.usage ?? null,
      cost_usd: log.costUsd ?? null,
      duration_ms: log.durationMs ?? null,
      error: log.error ?? null,
    });
    if (error) {
      console.warn(`[prompt-logging] insert failed: ${error.message}`);
    }
  } catch (err) {
    console.warn(`[prompt-logging] ${err instanceof Error ? err.message : err}`);
  }
}
