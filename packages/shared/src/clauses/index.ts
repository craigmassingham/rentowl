// Server-only (reads /docs/clauses from disk) — import from
// "@rentowl/shared/clauses", never from the package root, so client
// bundles don't pull in node:fs.
export { getClauseLibrary } from "./load";
export { parseClauseFile, parseFrontmatter, extractVariables } from "./parse";
export {
  substituteVariables,
  renderClauseHtml,
  MissingClauseVariablesError,
} from "./render";
export { CLAUSE_VARIABLE_DEFAULTS } from "./defaults";
export {
  ClauseFrontmatterSchema,
  CLAUSE_CATEGORIES,
  type Clause,
  type ClauseFrontmatter,
} from "./types";
