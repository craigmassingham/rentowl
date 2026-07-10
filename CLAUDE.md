# CLAUDE.md — RentOwl repo context

> This file is read by Claude Code (and other AI coding tools) on every session. It is the single source of truth for how to work on this codebase. When something changes materially, update this file.

---

## 1. What we're building

**RentOwl** is a Singapore-first admin OS for DIY landlords. It handles the rental lifecycle after a tenant is found: contract generation, rent tracking, reminders, maintenance triage, renewals, and IRAS reporting.

**We are NOT building:**
- A listings marketplace (PropertyGuru, 99.co, Ohmyhome own this)
- An agent CRM (wrong customer)
- A custodial payments platform (regulatory suicide on a bootstrap budget)
- A contractor marketplace (chicken-and-egg problem, defer to v2)
- Native mobile apps (PWA-first; native only after PMF)
- Anything for markets outside Singapore (v1 is SG-only, opinionated)

**Our positioning:**
> "The rental admin that handles itself. Built in Singapore, for Singapore landlords who don't want to pay 10%."

If a feature request or design decision doesn't serve this positioning, we don't build it.

---

## 2. The user we build for

Primary persona: **"Accidental landlord"** — someone who owns 1–2 SG properties, rents one out, spends 4–6 hours/month on admin, either pays an agent 10% reluctantly or self-manages in a spreadsheet.

They are:
- Time-poor (working professional, 30–55 years old)
- Financially literate but not a property professional
- Mobile-first but comfortable on desktop
- Comfortable with WhatsApp, uncomfortable with new apps
- Trust-driven — will not put rent flows through something that looks janky

Every UX decision optimises for **removing admin, not adding features.**

---

## 3. Product principles (in priority order)

1. **Boring is good.** Landlords do not want a delightful "wow" moment when checking if rent came in. They want confidence. Match the tone of a bank app, not a social app.
2. **Do less, better.** If a feature isn't in the 4-month MVP scope (see ROADMAP.md), don't add it because "it's easy." Every feature has ongoing support cost.
3. **Singapore-native, always.** Currency is SGD. Dates are DD/MM/YYYY. Phone numbers are +65 by default. Address fields understand HDB block/unit format. Contract clauses reference SG law. If we're ever tempted to add "region" as a config, stop and reconsider whether that's really this product.
4. **PDPA-first data handling.** Every field that stores personal data (NRIC, phone, income) is auditable. Retention policies are explicit. Deletion is real deletion, not a `deleted_at` flag.
5. **Progressive disclosure.** A first-time landlord should see 5 things on their dashboard. A portfolio landlord should be able to expand into detail. No feature is discoverable by hunting.
6. **AI is a tool, not a personality.** No "Hi! I'm Rowlie the RentOwl AI!" No emoji-heavy chat bubbles. When AI does something (draft a clause, triage a ticket), it's labelled clearly and always human-overridable.
7. **Every error message tells the user what to do next.** Not "Something went wrong." Say "Payment reminder didn't send. Retry, or check WhatsApp connection in Settings."

---

## 4. Tone of voice

**Voice:** Clear, calm, competent. A trusted advisor who used to be a landlord themselves.

**Do:**
- Use plain English. "Rent is 3 days overdue" not "Payment delinquency: 3 days"
- Reference SG context specifically. "This clause is standard in IEA templates" not "This is a common lease provision"
- Use active voice
- Say what will happen next. "We'll remind Sarah on 25 Apr via WhatsApp"

**Don't:**
- Use marketing hype ("supercharge your rental!")
- Use emoji in UI (except very sparingly in tenant-facing messages, and never in landlord dashboard)
- Say "just" ("just click here" — it's condescending)
- Apologise excessively. Own errors, but move on.

**Reference stylebook:** Stripe docs, Linear, Notion product surfaces. Not Duolingo, not Slack, not Mailchimp.

---

## 5. Tech stack — decisions and rationale

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript strict | SSR for SEO landing pages, App Router for good defaults, TS strict catches half our bugs at compile time |
| UI | Tailwind + shadcn/ui | Design fluency + speed; you already know these |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions) | One vendor for auth, DB, storage, functions. Bootstrap-optimal. Postgres RLS is our authorization layer. |
| AI | Anthropic Claude API (Sonnet default, Opus for lease generation) | Sonnet handles triage and reminders; Opus's precision justifies its cost for legal document generation |
| Payments (subscriptions) | Stripe Billing | Standard, well-documented, handles SG tax properly |
| Rent tracking (NOT custody) | PayNow QR generation + manual confirmation initially; bank statement OCR ingestion in v1.1 | We do not hold funds. Ever. |
| Messaging | WhatsApp Business API via 360dialog (preferred) or Twilio | WhatsApp is how SG tenants and landlords actually communicate. Email is fallback only. |
| Hosting | Vercel (frontend) + Supabase (everything else) | Free tiers cover us to ~1000 users |
| Analytics | PostHog (self-hosted on Supabase or PostHog Cloud EU) | Privacy-friendly, event-based, product analytics + feature flags in one |
| Errors | Sentry | Standard |
| Emails (transactional) | Resend | Modern DX, cheap, reliable |
| Design | Figma | Component library mirrors shadcn/ui in code |
| Repo | GitHub | Private, main branch protected |
| CI/CD | GitHub Actions → Vercel + Supabase migrations via CLI | Standard |

### Non-negotiables

- **TypeScript strict mode always on.** No `any` unless comment explains why.
- **No client-side secrets.** Ever. Supabase Edge Functions or Next.js API routes only.
- **Postgres RLS on every table with personal data.** No exceptions.
- **All AI prompts live in `/prompts/*.ts` files, not inline in code.** So we can eval them.
- **All external API calls go through a typed wrapper** in `/lib/integrations/*`. No fetch() sprinkled through components.

### Decisions we made and won't revisit without cause

- Next.js over Remix or SvelteKit (Vercel + Next is best-supported by Claude Code)
- Supabase over Firebase (Postgres > NoSQL for our data model)
- PWA over React Native (bootstrap constraint, not a philosophical claim)
- Tailwind over CSS-in-JS (bundle size, DX with shadcn/ui)
- Server Components by default (not client) — flip to client only when interactivity requires it

---

## 6. Repo structure

```
rentowl/
├── CLAUDE.md                    # This file
├── ARCHITECTURE.md              # System design decisions
├── ROADMAP.md                   # What's in scope, what's out
├── DECISIONS.md                 # Architecture Decision Records (ADRs)
├── SECURITY.md                  # PDPA compliance, secrets handling
├── README.md                    # Setup instructions
├── /apps
│   ├── /web                     # Next.js app (landlord + tenant PWA)
│   └── /marketing               # Marketing site (may merge into /web later)
├── /packages
│   ├── /ui                      # shadcn/ui components + our custom ones
│   ├── /db                      # Supabase migrations + typed client
│   ├── /prompts                 # All Claude prompts, versioned
│   ├── /integrations            # WhatsApp, PayNow, Stripe, Singpass wrappers
│   └── /shared                  # Shared types, utils, constants
├── /supabase
│   ├── /migrations              # SQL migrations, timestamped
│   ├── /functions               # Edge functions (Deno)
│   └── /seed                    # Seed data for dev
├── /docs
│   ├── /prompts                 # Prompt design docs, eval results
│   ├── /clauses                 # IEA clause reference library
│   └── /regulatory              # SG law summaries, IRAS notes
└── /scripts                     # Ops scripts
```

---

## 7. Naming conventions

- **Files:** kebab-case (`tenancy-agreement.ts`)
- **Components:** PascalCase (`TenancyAgreementForm.tsx`)
- **Functions:** camelCase (`generateTenancyAgreement`)
- **Types/interfaces:** PascalCase (`TenancyAgreement`, `TenancyAgreementDraft`)
- **DB tables:** snake_case, plural (`tenancy_agreements`, `rent_payments`)
- **DB columns:** snake_case (`start_date`, `landlord_id`)
- **Env vars:** SCREAMING_SNAKE_CASE (`ANTHROPIC_API_KEY`)
- **Routes:** kebab-case (`/properties/[id]/tenancy-agreement/new`)

### Domain language (be consistent)

| Use | Don't use |
|---|---|
| Landlord | Owner, host, lessor |
| Tenant | Renter, occupant, lessee |
| Property | Unit, listing, home (unless in tenant-facing copy) |
| Tenancy | Lease (US), rental |
| Tenancy Agreement (TA) | Lease agreement, contract |
| Rent | Payment (except when discussing the payment mechanism) |
| Deposit | Bond, security |

Everywhere. UI, database, code, docs.

---

## 8. Development standards

### TypeScript

- Strict mode on. No `any`. Use `unknown` and narrow.
- Zod schemas for all external inputs (form data, API bodies, AI outputs).
- Discriminated unions for state machines.
- Named exports only (except Next.js pages/layouts, which require default).

### React

- Server Components by default. Add `"use client"` only when needed (state, effects, event handlers).
- No prop drilling beyond 2 levels — use context or lift state.
- No `useEffect` for data fetching in Server Components. Use async components.
- Loading states via Suspense and `loading.tsx`.
- Error boundaries via `error.tsx` on every route.

### Database

- All migrations timestamped: `20260501120000_add_tenancy_agreements.sql`
- Every table has: `id uuid primary key default gen_random_uuid()`, `created_at`, `updated_at`
- RLS enabled on every table with user data.
- Foreign keys always declared.
- Indexes on all foreign key columns and any column used in WHERE clauses.
- No cascading deletes on user data — soft-flag and confirm.

### AI prompts

- Every prompt lives in `/packages/prompts/*.ts` and exports a typed function.
- Every prompt has an accompanying `.eval.ts` file with at least 5 test cases.
- System prompts include: role, context, format, constraints, examples.
- All outputs are structured (JSON with Zod schema validation on the response).
- Every prompt logs (prompt version, model, input hash, output, cost) to Supabase for later analysis.

### Testing

- Every API route has an integration test (Vitest + supertest-like helper).
- Every prompt has an eval file.
- E2E tests via Playwright for critical flows: signup, create property, generate TA, send reminder, receive payment ack.
- No unit tests for pure UI components. Test behaviour, not implementation.

### Git

- `main` branch always deployable. Protected. No direct pushes.
- Feature branches: `feat/M1W2-tenancy-agreement-form`
- Fix branches: `fix/M1W3-signup-race-condition`
- Commit messages: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- One PR = one feature. Keep PRs under ~400 lines when possible.

### Security and PDPA

- **NRIC is a category 1 sensitive field.** Encrypted at rest (Supabase column-level or via app-layer encryption). Never logged. Never in URLs.
- Personal data has a `retention_policy` field indicating auto-delete date.
- Right-to-erasure is a real endpoint that really deletes data (not just marks it).
- All third-party integrations reviewed for data residency (SG or approved countries).
- Secrets: `.env.local` for dev, Vercel + Supabase secret managers for prod. Never in the repo.

---

## 9. What Claude Code does well vs. what needs a human

### Claude Code owns

- Feature implementation from a written spec
- Bug fixes when the failure mode is clear
- Refactoring within an established pattern
- Writing tests
- Writing migrations from a schema change spec
- Generating boilerplate (new routes, new components, new prompt files)
- Documentation of code as-built

### Human (Craig) owns

- Product decisions (what to build, what not to build)
- Design decisions above component level (flows, information architecture, tone)
- Prompt design and eval-writing (Claude Code can assist, but Craig approves)
- Any change touching payment flows, contracts, or personal data
- User conversations and interpretation of feedback
- Regulatory judgment calls
- The decision to add a dependency
- The decision to add a table
- The decision to break API contracts

### Ambiguous — discuss before starting

- Anything cross-cutting (auth, RLS, error handling patterns)
- Anything customer-facing in copy (UI strings)
- Anything performance-sensitive (list rendering, subscriptions)

---

## 10. Session working style

When starting a session:

1. **Read the ticket in `/tickets/<current-month>/<current-week>.md`** and confirm you understand the scope. If the ticket is ambiguous, ask before writing code.
2. **List the files you plan to touch** before touching them.
3. **Prefer editing over creating.** Reuse existing patterns.
4. **Ask about assumptions** rather than assuming.
5. **Run tests** before saying "done." Not just typecheck — actual tests.
6. **Write the commit message** at the end summarising what changed and why.
7. **Update this file** if you learn something that future sessions should know.

When stuck:

- Ask, don't guess. Especially on tone, on data model, on regulatory questions.
- Show me two options with tradeoffs rather than picking silently.

When you disagree with the ticket:

- Say so. Craig would rather have the friction than build the wrong thing.

---

## 11. What to update, when

- **CLAUDE.md** (this file): when a principle changes, when a naming convention changes, when a stack piece is added or removed
- **ARCHITECTURE.md**: when a system boundary changes
- **DECISIONS.md**: any material technical decision — add an ADR entry
- **ROADMAP.md**: monthly, after retro
- **README.md**: when setup steps change

Stale docs are worse than no docs. Prune ruthlessly.
