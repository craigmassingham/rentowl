import { ClauseFrontmatterSchema, type Clause } from "./types";

/**
 * Parses the strict YAML subset used by clause frontmatter — flat keys with
 * scalar values ("quoted", bare, number, boolean) or [inline, string, arrays].
 * Deliberately not a YAML library: the format is ours, and a parse error
 * should fail loudly rather than guess (legal content, no surprises).
 */
export function parseFrontmatter(source: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const rawLine of source.split("\n")) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;
    const colon = line.indexOf(":");
    if (colon === -1) {
      throw new Error(`Invalid frontmatter line (expected "key: value"): "${line}"`);
    }
    const key = line.slice(0, colon).trim();
    const raw = line.slice(colon + 1).trim();
    result[key] = parseScalarOrArray(raw, line);
  }
  return result;
}

function parseScalarOrArray(raw: string, context: string): unknown {
  if (raw.startsWith("[")) {
    if (!raw.endsWith("]")) {
      throw new Error(`Unterminated array in frontmatter: "${context}"`);
    }
    const inner = raw.slice(1, -1).trim();
    if (inner === "") return [];
    return inner.split(",").map((item) => parseScalar(item.trim()));
  }
  return parseScalar(raw);
}

function parseScalar(raw: string): unknown {
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    return raw.slice(1, -1);
  }
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  return raw;
}

/** All {snake_case} template variables in a body, deduped, in order of first use. */
export function extractVariables(body: string): string[] {
  const seen = new Set<string>();
  for (const match of body.matchAll(/\{([a-z][a-z0-9_]*)\}/g)) {
    seen.add(match[1]!);
  }
  return [...seen];
}

/** Parses one clause markdown file (frontmatter + `# Title` + body). */
export function parseClauseFile(source: string, filename: string): Clause {
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(source);
  if (!match) {
    throw new Error(`${filename}: missing frontmatter block`);
  }

  const frontmatterResult = ClauseFrontmatterSchema.safeParse(
    parseFrontmatter(match[1]!)
  );
  if (!frontmatterResult.success) {
    const issues = frontmatterResult.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`${filename}: invalid frontmatter — ${issues}`);
  }

  const content = match[2]!.trim();
  const titleMatch = /^# (.+)\n?/.exec(content);
  if (!titleMatch) {
    throw new Error(`${filename}: body must start with a single "# Title" heading`);
  }
  const body = content.slice(titleMatch[0].length).trim();
  if (/^#{1,6} /m.test(body)) {
    throw new Error(`${filename}: body may not contain further headings`);
  }

  return {
    ...frontmatterResult.data,
    title: titleMatch[1]!.trim(),
    body,
    variables: extractVariables(body),
  };
}
