# RentOwl

The rental admin that handles itself. Built in Singapore, for Singapore landlords who don't want to pay 10%.

Contracts, rent tracking, WhatsApp reminders, and AI maintenance triage for DIY landlords — after the tenant is found. No listings, no custody of funds, SG-only.

## Key documents

| File | Purpose |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Repo-wide context, principles, standards — read first |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System shape, data model, integrations, key flows |
| [ROADMAP.md](ROADMAP.md) | What's in scope, what's out |
| [DECISIONS.md](DECISIONS.md) | Architecture Decision Records |
| [SECURITY.md](SECURITY.md) | PDPA compliance, secrets handling |
| [sprint-plans/](sprint-plans/) | Month-by-month ticket plans |

## Stack

Next.js 15 (App Router) + TypeScript strict · Tailwind + shadcn/ui · Supabase (Postgres, Auth, Storage, Edge Functions) · Anthropic Claude API · Vercel.

## Setup

Prerequisites: Node 22+, pnpm (via `corepack enable`).

```bash
git clone https://github.com/craigmassingham/rentowl.git
cd rentowl
pnpm install
cp .env.example apps/web/.env.local   # fill in Supabase values
pnpm dev                              # http://localhost:3000
```

## Commands

```bash
pnpm dev         # run the web app locally
pnpm build       # production build
pnpm lint        # eslint across the workspace
pnpm typecheck   # tsc --noEmit across the workspace
pnpm test        # vitest across the workspace
```

## Repo layout

```
apps/web              Next.js app (landlord + tenant PWA, marketing pages)
packages/ui           Shared components (shadcn/ui wrappers)
packages/db           Supabase clients + generated types
packages/prompts      All Claude prompts, versioned, with evals
packages/integrations Typed wrappers for every external API
packages/shared       Shared types, utils, constants
supabase/             Migrations, Edge Functions, seed data
docs/                 Clause library, regulatory notes, retros, user research
sprint-plans/         M1–M4 ticket plans
```

## Contributing

Solo project (Craig Massingham), built evenings with Claude Code. Branch conventions, commit format, and standards: see [CLAUDE.md](CLAUDE.md) §8.
