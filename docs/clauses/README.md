# Clause library

One markdown file per clause. These files are the **single source of truth**
for tenancy agreement content — the TA generator (M1-W3-02) selects from this
library and fills variables; it never drafts clause text itself.

> **Review status: DRAFT.** Every clause body must be reviewed by Craig
> against an IEA-published template before any TA is generated for a real
> user. That review is recorded by merging the PR that adds or changes a
> clause — do not merge clause changes without it.

## File format

```markdown
---
clause_id: minor-repair
version: "1.0"
applicability: [hdb, condo, landed]
category: repairs
required: true
order: 60
---
# Minor Repair Clause

Body text with {template_variables}.
```

- `clause_id` — kebab-case, matches the filename (`minor-repair.md`)
- `version` — bump on any wording change; the generator logs it per TA
- `applicability` — property types this clause can apply to (`hdb`, `condo`,
  `landed` — same values as the `property_type` DB enum)
- `category` — one of: parties, term, rent, deposit, utilities, repairs,
  use, handover, termination, law
- `required` — required clauses are always included for applicable property
  types; optional ones are landlord choices (e.g. diplomatic)
- `order` — sort key for document assembly, spaced by 10s

## Body conventions

- Markdown subset only: `#` title (exactly one, first line of body),
  paragraphs, and numbered lists (`1.`). The renderer supports nothing else.
- Template variables are `{snake_case}`. Values arrive **pre-formatted** —
  dates as DD/MM/YYYY, currency as S$1,234 — so clause text never formats.
- Variables with sensible defaults (e.g. `{minor_repair_threshold_sgd}` →
  S$200) are declared in `packages/shared/src/clauses/defaults.ts`.
