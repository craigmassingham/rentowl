import { readFileSync, readdirSync, existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { parseClauseFile } from "./parse";
import type { Clause } from "./types";

/**
 * Finds the repo root (marked by pnpm-workspace.yaml) so the loader works
 * from any workspace package, tests, and scripts alike.
 *
 * Deployment note (W3-03): server code on Vercel must add
 * `outputFileTracingIncludes: { "/...": ["docs/clauses/**"] }` in next.config
 * so these files ship with the serverless bundle.
 */
function findClausesDir(startDir: string): string {
  let dir = startDir;
  for (;;) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) {
      return join(dir, "docs", "clauses");
    }
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(
        `Couldn't locate the repo root from ${startDir} — run from inside the repo, or pass { dir }.`
      );
    }
    dir = parent;
  }
}

/**
 * Loads, validates, and sorts the clause library from /docs/clauses.
 * Throws on any malformed clause — a broken library must fail loudly at
 * load time, never at TA-generation time.
 */
export function getClauseLibrary(options: { dir?: string } = {}): Clause[] {
  const dir = options.dir ?? findClausesDir(process.cwd());

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
