import { describe, expect, it } from "vitest";
import {
  MissingClauseVariablesError,
  extractVariables,
  getClauseLibrary,
  parseClauseFile,
  parseFrontmatter,
  renderClauseHtml,
  substituteVariables,
} from "./index";
import type { Clause } from "./types";

const sampleFile = `---
clause_id: sample
version: "1.0"
applicability: [hdb, condo]
category: rent
required: true
order: 10
---
# Sample Clause

The rent is {monthly_rent_sgd} per month, payable by **{tenant_name}**.

1. First item about {monthly_rent_sgd}.
2. Second item.
`;

function sampleClause(): Clause {
  return parseClauseFile(sampleFile, "sample.md");
}

describe("parseFrontmatter", () => {
  it("parses scalars, arrays, quoted strings, booleans, numbers", () => {
    expect(
      parseFrontmatter(
        'clause_id: sample\nversion: "1.0"\napplicability: [hdb, condo]\nrequired: false\norder: 30'
      )
    ).toEqual({
      clause_id: "sample",
      version: "1.0",
      applicability: ["hdb", "condo"],
      required: false,
      order: 30,
    });
  });

  it("rejects lines without a key", () => {
    expect(() => parseFrontmatter("not a key value line")).toThrow(/expected "key: value"/);
  });
});

describe("parseClauseFile", () => {
  it("parses frontmatter, title, body, and variables", () => {
    const clause = sampleClause();
    expect(clause.clause_id).toBe("sample");
    expect(clause.title).toBe("Sample Clause");
    expect(clause.body).toContain("The rent is {monthly_rent_sgd}");
    expect(clause.variables).toEqual(["monthly_rent_sgd", "tenant_name"]);
  });

  it("rejects a body without a title heading", () => {
    const noTitle = sampleFile.replace("# Sample Clause\n", "");
    expect(() => parseClauseFile(noTitle, "sample.md")).toThrow(/must start with a single/);
  });

  it("rejects extra headings in the body", () => {
    const extra = `${sampleFile}\n## Sneaky subsection\n`;
    expect(() => parseClauseFile(extra, "sample.md")).toThrow(/further headings/);
  });

  it("rejects invalid frontmatter with a pointed error", () => {
    const bad = sampleFile.replace("category: rent", "category: miscellaneous");
    expect(() => parseClauseFile(bad, "sample.md")).toThrow(/category/);
  });
});

describe("extractVariables", () => {
  it("dedupes and preserves first-use order", () => {
    expect(extractVariables("{b} then {a} then {b}")).toEqual(["b", "a"]);
  });
});

describe("substituteVariables", () => {
  it("fills every placeholder", () => {
    const text = substituteVariables(sampleClause(), {
      monthly_rent_sgd: "S$3,200",
      tenant_name: "Sarah Tan",
    });
    expect(text).toContain("The rent is S$3,200 per month");
    expect(text).toContain("**Sarah Tan**");
    expect(text).not.toMatch(/\{[a-z_]+\}/);
  });

  it("falls back to declared defaults (minor repair threshold)", () => {
    const clause: Pick<Clause, "clause_id" | "body"> = {
      clause_id: "minor-repair",
      body: "Repairs up to {minor_repair_threshold_sgd} per item.",
    };
    expect(substituteVariables(clause, {})).toBe("Repairs up to S$200 per item.");
    expect(substituteVariables(clause, { minor_repair_threshold_sgd: "S$350" })).toBe(
      "Repairs up to S$350 per item."
    );
  });

  it("throws with the names of missing variables", () => {
    expect(() => substituteVariables(sampleClause(), { tenant_name: "Sarah Tan" })).toThrow(
      MissingClauseVariablesError
    );
    try {
      substituteVariables(sampleClause(), { tenant_name: "Sarah Tan" });
    } catch (error) {
      expect((error as MissingClauseVariablesError).missing).toEqual(["monthly_rent_sgd"]);
    }
  });
});

describe("renderClauseHtml", () => {
  it("renders title, paragraphs, numbered lists, and bold", () => {
    const html = renderClauseHtml(sampleClause(), {
      monthly_rent_sgd: "S$3,200",
      tenant_name: "Sarah Tan",
    });
    expect(html).toContain('data-clause-id="sample"');
    expect(html).toContain('data-clause-version="1.0"');
    expect(html).toContain("<h2>Sample Clause</h2>");
    expect(html).toContain("<p>The rent is S$3,200 per month, payable by <strong>Sarah Tan</strong>.</p>");
    expect(html).toContain("<ol><li>First item about S$3,200.</li><li>Second item.</li></ol>");
  });

  it("escapes HTML in substituted values", () => {
    const html = renderClauseHtml(sampleClause(), {
      monthly_rent_sgd: "S$3,200",
      tenant_name: '<script>alert("x")</script>',
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("getClauseLibrary", () => {
  it("loads all 11 v1 clauses sorted by order", () => {
    const library = getClauseLibrary();
    expect(library).toHaveLength(11);
    expect(library.map((c) => c.order)).toEqual([...library.map((c) => c.order)].sort((a, b) => a - b));
    expect(library[0]!.clause_id).toBe("parties-and-property");
    expect(library.at(-1)!.clause_id).toBe("governing-law");
  });

  it("marks only the diplomatic clause optional, scoped to condo and landed", () => {
    const library = getClauseLibrary();
    const optional = library.filter((c) => !c.required);
    expect(optional.map((c) => c.clause_id)).toEqual(["diplomatic"]);
    expect(optional[0]!.applicability).toEqual(["condo", "landed"]);
  });

  it("every clause renders with the standard variable set", () => {
    const variables = {
      agreement_date: "01/07/2026",
      landlord_name: "Alicia Wong",
      tenant_name: "Sarah Tan",
      property_address: "Blk 123 Bishan Street 13, #08-123, Singapore 570123",
      term_months: "12",
      start_date: "01/08/2026",
      end_date: "31/07/2027",
      monthly_rent_sgd: "S$3,200",
      payment_day: "1",
      deposit_sgd: "S$3,200",
    };
    for (const clause of getClauseLibrary()) {
      const html = renderClauseHtml(clause, variables);
      expect(html).toContain("<h2>");
      expect(html).not.toMatch(/\{[a-z_]+\}/);
    }
  });
});
