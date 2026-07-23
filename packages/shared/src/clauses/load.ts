import { readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseClauseFile } from "./parse";
import type { Clause } from "./types";

/**
 * The clauses directory, resolved relative to this module's own location
 * rather than process.cwd(). cwd-based tree-walking (the previous approach,
 * searching upward for pnpm-workspace.yaml) is unreliable on serverless
 * platforms: cwd is platform-defined and marker files outside the traced
 * import graph aren't guaranteed to ship with the deployed bundle.
 *
 * Deployment note (W3-03): server code on Vercel must add
 * `outputFileTracingIncludes` in next.config for every route that (directly
 * or transitively) imports this module, covering both
 * `packages/shared/src/clauses/../../../../docs/clauses/**` (this file) and
 * `packages/prompts/tenancy-agreements/*.md` (generate.system.md) — a
 * runtime readFileSync/readdirSync is invisible to Next's static tracer.
 */
const CLAUSES_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../docs/clauses"
);

/**
 * Loads, validates, and sorts the clause library from /docs/clauses.
 * Throws on any malformed clause — a broken library must fail loudly at
 * load time, never at TA-generation time.
 */
export function getClauseLibrary(options: { dir?: string } = {}): Clause[] {
  const dir = options.dir ?? CLAUSES_DIR;

  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .sort();

  const clauses = files.map((file) => {
    const clause = parseClauseFile(readFileSync(join(dir, file), "utf8"), file);
    const expectedId = basename(file, ".md");
    if (clause.clause_id !== expectedId) {
      throw new Error(
        `${file}: clause_id "${clause.clause_id}" must match the filename ("${expectedId}")`
      );
    }
    return clause;
  });

  const orders = new Set<number>();
  for (const clause of clauses) {
    if (orders.has(clause.order)) {
      throw new Error(`Duplicate clause order ${clause.order} — orders must be unique.`);
    }
    orders.add(clause.order);
  }

  return clauses.sort((a, b) => a.order - b.order);
}
