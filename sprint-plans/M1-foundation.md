# Month 1 — Foundation + Contract Engine

**Goal:** By end of month, a landlord can sign up, add a property, add tenant details, and generate a legally-recognisable IEA-style tenancy agreement PDF. No payments yet, no reminders yet.

**Success criteria at end of M1:**
- 5 pilot landlords onboarded
- Each has generated at least 1 TA PDF and shared it with a tenant
- 0 critical bugs in the signup/onboarding flow
- Weekly user interviews scheduled with all 5

**Time budget:** ~30 build hours (7-8/week over 4 weeks)

---

## Week 1 — Repo setup, auth, empty dashboard

### Ticket M1-W1-01: Repo scaffold

**Objective:** Create the repo skeleton per ARCHITECTURE.md §6.

**Deliverables:**
- Next.js 15 app with App Router, TypeScript strict, Tailwind, shadcn/ui installed
- Supabase project created (SG region), CLI configured for local dev
- `.env.example` populated with every var we'll need
- CLAUDE.md, ARCHITECTURE.md, ROADMAP.md, README.md checked in
- GitHub Actions workflow: lint, typecheck, test on PR
- Vercel project connected, main branch auto-deploys
- One `/api/health` route returning `{status: "ok", version: <git-sha>}`

**Acceptance:**
- `pnpm install && pnpm dev` works from clean clone
- Push to main → Vercel deploys → `/api/health` responds 200

**Estimated Claude Code time:** 90 min for build + 30 min review

---

### Ticket M1-W1-02: Auth (email + magic link)

**Objective:** Landlords can sign up, verify email, log in, log out.

**Deliverables:**
- Supabase Auth configured for email + password AND magic link
- Routes: `/signup`, `/login`, `/logout`, `/auth/callback`, `/auth/verify`
- Middleware protecting `/app/*` routes
- Session context via Server Components + Supabase server client
- Basic email templates (via Resend or Supabase built-in) — plain, no marketing
- `/app/dashboard` route that renders "Hello, {name}" as placeholder

**Acceptance:**
- Full signup → verify → login → logout works locally and on Vercel
- Trying to access `/app/dashboard` while logged out redirects to `/login`
- Session persists on page reload
- E2E test in Playwright covers the happy path

**Estimated Claude Code time:** 2 hours build + 30 min review

---

### Ticket M1-W1-03: Design system stub

**Objective:** Establish the visual foundation so future tickets don't reinvent it.

**Deliverables:**
- Tailwind config with our palette (see below)
- shadcn/ui components installed: Button, Input, Label, Card, Dialog, Toast, Form, Select, DatePicker, Tabs
- Wrapper components in `/packages/ui/` with our tokens applied
- `/app/(marketing)/style-guide` route showing every component (dev-only)
- Typography scale: SF Pro / Inter fallback, sizes per shadcn defaults
- Dark mode: NOT built in v1 (light only, keep scope tight)

**Palette (starter — refine later):**
- Primary: neutral navy (owl-ish, not corporate blue) — `#1E293B` family
- Accent: warm sand (SG-appropriate, not corporate) — `#D4A574` family
- Success: `#059669`
- Warning: `#D97706`
- Danger: `#DC2626`
- Neutrals: Tailwind zinc scale

**Acceptance:**
- Style guide page renders every component in every variant
- No hardcoded colours in feature code — always Tailwind tokens

**Estimated Claude Code time:** 90 min build + 45 min Craig review (design taste, not skippable)

---

## Week 2 — Data model + property + tenancy CRUD

### Ticket M1-W2-01: Initial schema migration

**Objective:** Create the v1 tables per ARCHITECTURE.md §2.

**Deliverables:**
- Migration file: `20260501120000_initial_schema.sql` creating: `users_profile`, `properties`, `tenancies`, `tenancy_agreements`, `rent_cycles`, `tickets`, `ticket_messages`, `reminders`, `audit_log`
- RLS policies enabled on all tables per ARCHITECTURE §2.
- Generated TypeScript types via `supabase gen types typescript`
- Seed script inserting 1 test landlord + 2 properties + 1 tenancy for local dev

**Acceptance:**
- `supabase db reset` applies migration cleanly
- Generated types compile
- Seed data is queryable
- RLS verified via test: user A cannot read user B's properties

**Estimated Claude Code time:** 2 hours build + 30 min review

---

### Ticket M1-W2-02: Property CRUD

**Objective:** Landlord can add, view, edit, delete a property.

**Deliverables:**
- `/app/properties` — list view
- `/app/properties/new` — form
- `/app/properties/[id]` — detail view
- `/app/properties/[id]/edit` — form
- API routes: `POST/GET/PATCH/DELETE /api/properties`
- Zod schemas for input validation
- Server actions preferred over API routes where clean
- Empty state on `/app/properties` when landlord has none
- Confirm dialog on delete

**Address handling note:** SG addresses are Block + Street + #Unit + Postal. Do not use a Google-style single address field. Postal is 6 digits.

**Acceptance:**
- E2E test: add property → see in list → edit → delete
- RLS confirmed: cannot see or edit another user's property
- Invalid postal (not 6 digits) shows inline error

**Estimated Claude Code time:** 3 hours build + 30 min review

---

### Ticket M1-W2-03: Tenancy CRUD

**Objective:** Landlord can add a tenancy to a property (tenant name, dates, rent, deposit).

**Deliverables:**
- `/app/properties/[id]/tenancies/new`
- `/app/tenancies/[id]` — detail
- `/app/tenancies/[id]/edit`
- Tenant details captured on the tenancy, tenant `users` row is created only when tenant accepts invite (M2 deferred). For now, tenant is a "prospective_tenant" JSON blob on the tenancy.
- Form fields: tenant name, tenant email, tenant phone, start date, end date, monthly rent SGD, deposit SGD, payment day (1–28)
- Business rules: end_date > start_date, rent > 0, deposit >= 0

**Acceptance:**
- Can create a tenancy on a property
- Dates use DD/MM/YYYY throughout UI
- Currency displays as "S$1,234" (not "$1234" or "SGD 1234")
- Overlapping active tenancies on same property blocked with clear error

**Estimated Claude Code time:** 2.5 hours build + 30 min review

---

## Week 3 — Contract engine (the meat)

### Ticket M1-W3-01: Clause library

**Objective:** Codify the IEA standard clauses as structured, versioned data.

**Deliverables:**
- `/docs/clauses/` directory with one markdown file per clause, structured frontmatter:
  ```
  ---
  clause_id: diplomatic
  version: 1.0
  applicability: [private_condo, landed]  # not hdb typically
  category: termination
  required: false
  ---
  # Diplomatic Clause
  {body with template vars like {tenant_name}}
  ```
- Initial clauses (v1 must-have):
  - Parties and Property
  - Term
  - Rent and Payment
  - Deposit
  - Utilities and Charges
  - Diplomatic Clause (optional)
  - Minor Repair Clause (with configurable SGD threshold — default S$200)
  - Use of Premises
  - Handover / Inventory
  - Termination
  - Governing Law (Singapore)
- TypeScript loader: `getClauseLibrary()` returns typed array
- Craig personally reviews every clause against IEA template before shipping. **This is not Claude Code's call.**

**Acceptance:**
- Every clause has been reviewed by Craig against an IEA-published template
- Clauses render into HTML with variable substitution working
- Unit tests on the template variable substitution

**Estimated Claude Code time:** 2 hours structure + 4 hours Craig review (spread across the week)

---

### Ticket M1-W3-02: Tenancy agreement generation prompt

**Objective:** Build the Anthropic-backed generator that assembles a TA from tenancy data + clause selections.

**Deliverables:**
- `/packages/prompts/tenancy-agreements/generate.ts` per ARCHITECTURE §4 pattern
- `/packages/prompts/tenancy-agreements/generate.system.md` — the system prompt
- `/packages/prompts/tenancy-agreements/generate.eval.ts` — 5 test cases:
  - HDB, 1-year tenancy, no diplomatic clause
  - Condo, 2-year tenancy, with diplomatic clause
  - Condo, expat tenant, custom minor repair threshold
  - Landed, 3-year tenancy, joint tenants
  - HDB, room-rental only (not full unit)
- Uses Opus (not Sonnet) — precision matters for legal doc
- Output is structured JSON conforming to Zod schema (list of assembled clauses)
- Prompt is deterministic where possible (low temperature, strict output format)

**Prompt design notes for Claude Code:**
- Do NOT ask the AI to generate clause text from scratch. Pass in the clause library as context, and ask the AI to (a) select applicable clauses per property type + user choices, (b) fill in variables, (c) flag anything ambiguous.
- The AI's job is orchestration + variable filling, not legal drafting. Legal drafting was done by Craig in W3-01.

**Acceptance:**
- All 5 evals pass
- Output validates against Zod schema 100% of runs across 20 random inputs
- Cost per generation logged and under S$0.30

**Estimated Claude Code time:** 3 hours build + 2 hours prompt iteration with Craig

---

### Ticket M1-W3-03: TA generation UI + PDF rendering

**Objective:** Landlord clicks "Generate TA," picks clauses, sees preview, downloads PDF.

**Deliverables:**
- `/app/tenancies/[id]/agreement/new` — clause selection UI
- Preview pane rendering the assembled TA (React component)
- "Generate PDF" action → server-side render (react-pdf) → store in Supabase Storage → tenancy_agreements row created
- Download link on `/app/tenancies/[id]/agreement/[agreement_id]`
- PDF has: cover page (property + parties), assembled clauses, signature blocks (name, NRIC last 4, signature line, date), page numbers, "Generated by RentOwl — not legal advice" footer

**Acceptance:**
- End-to-end: fill tenancy → select clauses → preview → generate PDF → download → PDF is legible in Preview.app and Adobe Reader
- Signature blocks are aligned and printable
- Regenerating produces version 2 of the agreement, keeping v1 accessible

**Estimated Claude Code time:** 4 hours build + 1 hour review (PDF layout takes iterations)

---

## Week 4 — Onboarding flow + pilot launch

### Ticket M1-W4-01: Onboarding flow

**Objective:** New signups are guided through: add property → add tenancy → generate TA in one connected flow.

**Deliverables:**
- Progress indicator across steps
- Skip options where sensible
- "Save and come back" state on the tenancy row
- Post-completion: dashboard "empty state" replaced with "here's what you've set up" summary
- First-run tooltips on dashboard (dismissible, don't reappear)

**Acceptance:**
- Time from signup click to TA PDF download: <12 minutes for a moderately-prepared user (measured with Craig or friend)
- All 5 pilot users complete without support intervention

**Estimated Claude Code time:** 3 hours build + 30 min review

---

### Ticket M1-W4-02: Basic dashboard

**Objective:** The dashboard shows a landlord what they need to know.

**Deliverables:**
- Cards for: Properties count, Active tenancies count, Upcoming events (next renewal, upcoming rent due — even if reminders aren't built yet, show the dates)
- List of properties with a quick-action per property
- No charts, no analytics, no "insights" panels — that's Q3 stuff
- Mobile-responsive (this is a PWA)

**Acceptance:**
- Renders correctly at 375px, 768px, 1440px
- Pilot users can find their properties and tenancies within 3 seconds of login

**Estimated Claude Code time:** 2.5 hours build + 30 min review

---

### Ticket M1-W4-03: Pilot onboarding + feedback capture

**Objective:** Get the first 5 real users on and set up the feedback ritual.

**Deliverables (not Claude Code — Craig):**
- 5 pilot landlords identified (yourself + 4 friends)
- 30-min 1:1 kickoff call each (before they use it) — capture their current process
- Provisioned accounts
- In-product feedback button routing to Craig's email
- Weekly 15-min follow-up call booked with each
- Structured note template for each call in `/docs/user-research/M1/`

**Acceptance:**
- 5 users signed up and completed the onboarding
- 5 kickoff calls done, notes written up
- Week-1 follow-up calls scheduled

**Estimated Craig time:** 6 hours (this is the whole point of month 1)

---

## End-of-month M1 retro

Answer honestly in `/docs/retros/M1.md`:

1. What did the 5 pilots love / hate / not understand?
2. What did we build that no user has used yet? (Delete it or defer improving it.)
3. What did users ask for that isn't in the M2 plan? (Add to backlog with priority.)
4. Was the time budget realistic? (If off by >30%, reforecast M2–M4.)
5. Is the AI-triage-as-differentiator thesis holding up in early conversations? (This is the moat — if users don't care, we need to reconsider.)
6. Update CLAUDE.md with anything learned that should persist.
