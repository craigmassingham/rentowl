import { z } from "zod";
import { PROPERTY_TYPES } from "../property";

export const CLAUSE_CATEGORIES = [
  "parties",
  "term",
  "rent",
  "deposit",
  "utilities",
  "repairs",
  "use",
  "handover",
  "termination",
  "law",
] as const;

/** Frontmatter of a clause file in /docs/clauses. */
export const ClauseFrontmatterSchema = z.object({
  clause_id: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "clause_id must be kebab-case"),
  version: z.string().regex(/^\d+\.\d+$/, "version must look like 1.0"),
  applicability: z.array(z.enum(PROPERTY_TYPES)).min(1),
  category: z.enum(CLAUSE_CATEGORIES),
  required: z.boolean(),
  order: z.number().int().positive(),
});

export type ClauseFrontmatter = z.infer<typeof ClauseFrontmatterSchema>;

export type Clause = ClauseFrontmatter & {
  /** From the body's single `# Title` heading. */
  title: string;
  /** Markdown body without the title heading; contains {template_variables}. */
  body: string;
  /** All {variables} referenced by the body, in order of first appearance. */
  variables: string[];
};
