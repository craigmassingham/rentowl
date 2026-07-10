# SECURITY.md — PDPA compliance and secrets handling

> PDPA compliance is not a feature. It's a floor. (See CLAUDE.md §8 for the full standards.)

## Personal data rules

- **NRIC is a category 1 sensitive field.** Encrypted at rest, never logged, never in URLs.
- Every field storing personal data (NRIC, phone, income) is auditable via `audit_log`.
- Personal data carries a `retention_policy` indicating its auto-delete date.
- Right-to-erasure is a real endpoint that really deletes data — not a `deleted_at` flag.
- Postgres RLS on every table with personal data. No exceptions.
- Third-party integrations reviewed for data residency (SG or approved countries) before adoption.

## Secrets

- `.env.local` for local dev (gitignored). `.env.example` documents required vars with no values.
- Production: Vercel dashboard (web) and Supabase secrets (Edge Functions).
- No client-side secrets, ever. Server code only (API routes / Edge Functions).
- Never commit a secret. If one leaks into git history, rotate it immediately — history rewriting is not sufficient.

## Reporting

Security issues: email craigmassingham1@gmail.com. No bug bounty at this stage.
