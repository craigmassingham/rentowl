import { CLAUSE_VARIABLE_DEFAULTS } from "./defaults";
import { extractVariables } from "./parse";
import type { Clause } from "./types";

/** Thrown when a clause still has unfilled {variables} — a legal document
 * must never render with placeholders. */
export class MissingClauseVariablesError extends Error {
  constructor(
    public readonly clauseId: string,
    public readonly missing: string[]
  ) {
    super(
      `Clause "${clauseId}" is missing values for: ${missing.join(", ")}. ` +
        `Provide them, or add a default in clauses/defaults.ts.`
    );
    this.name = "MissingClauseVariablesError";
  }
}

/**
 * Fills {variables} in a clause body. Values must arrive pre-formatted
 * (DD/MM/YYYY dates, S$1,234 currency). Throws if any variable has neither
 * a provided value nor a default.
 */
export function substituteVariables(
  clause: Pick<Clause, "clause_id" | "body">,
  variables: Record<string, string>
): string {
  const merged: Record<string, string> = { ...CLAUSE_VARIABLE_DEFAULTS, ...variables };
  const missing = extractVariables(clause.body).filter((name) => !(name in merged));
  if (missing.length > 0) {
    throw new MissingClauseVariablesError(clause.clause_id, missing);
  }
  return clause.body.replace(/\{([a-z][a-z0-9_]*)\}/g, (_, name: string) => merged[name]!);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** `**bold**` is the only inline markdown clause bodies may use. */
function renderInline(text: string): string {
  return escapeHtml(text).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

/**
 * Renders a clause to HTML: title, paragraphs, and numbered lists — the full
 * extent of the markdown subset clause bodies are allowed to use.
 */
export function renderClauseHtml(
  clause: Clause,
  variables: Record<string, string>
): string {
  const text = substituteVariables(clause, variables);

  const blocks: string[] = [];
  let listItems: string[] | null = null;

  const flushList = () => {
    if (listItems) {
      blocks.push(`<ol>${listItems.join("")}</ol>`);
      listItems = null;
    }
  };

  for (const block of text.split(/\n\s*\n/)) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;
    for (const line of lines) {
      const item = /^\d+\.\s+(.*)$/.exec(line);
      if (item) {
        listItems ??= [];
        listItems.push(`<li>${renderInline(item[1]!)}</li>`);
      } else {
        flushList();
        blocks.push(`<p>${renderInline(line)}</p>`);
      }
    }
    flushList();
  }
  flushList();

  return [
    `<section class="clause" data-clause-id="${escapeHtml(clause.clause_id)}" data-clause-version="${escapeHtml(clause.version)}">`,
    `<h2>${renderInline(clause.title)}</h2>`,
    ...blocks,
    `</section>`,
  ].join("\n");
}
