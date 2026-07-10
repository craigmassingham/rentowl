# ARCHITECTURE.md — RentOwl technical architecture

> The system's shape, so Claude Code doesn't reinvent decisions per session. Update when a boundary changes.

---

## 1. High-level shape

RentOwl is a monolithic Next.js web application backed by Supabase, with three integration surfaces (Anthropic, WhatsApp, Stripe). No microservices. No custom backend. No k8s. Boring, on purpose.

```
                    ┌──────────────────────────┐
                    │   Landlord (PWA)         │
                    │   Tenant (PWA)           │
                    └──────────┬───────────────┘
                               │ HTTPS
                    ┌──────────▼───────────────┐
                    │   Next.js on Vercel      │
                    │   - Marketing pages      │
                    │   - App pages (SSR)      │
                    │   - API routes           │
                    └──┬───────────┬───────────┘
                       │           │
      ┌────────────────┘           └──────────────────┐
      │                                                │
┌─────▼────────┐                              ┌───────▼──────────┐
│  Supabase    │                              │  Integrations    │
│  - Postgres  │                              │  - Anthropic API │
│  - Auth      │                              │  - WhatsApp API  │
│  - Storage   │                              │  - Stripe        │
│  - Edge Fns  │                              │  - Resend        │
│  - Realtime  │                              │  - Singpass (v2) │
└──────────────┘                              └──────────────────┘
```

---

## 2. Data model (v1 core)

The domain models mirror the real-world nouns a landlord uses. Keep them stable — schema churn is expensive.

### Core entities

**users** — anyone who logs in
- id, email, phone, full_name, singpass_id (nullable), role (landlord | tenant | both), created_at

**properties** — a rentable unit
- id, owner_id (fk users), address_line_1, address_line_2, postal_code, property_type (hdb | condo | landed), bedrooms, bathrooms, floor_area_sqft, notes, created_at

**tenancies** — a specific rental period on a property
- id, property_id (fk), tenant_id (fk users, nullable until accepted), start_date, end_date, monthly_rent_sgd, deposit_sgd, payment_day (1–28), status (draft | active | ended | terminated), created_at

**tenancy_agreements** — the legal document instances
- id, tenancy_id (fk), version (int), status (draft | sent | signed | expired), clauses (jsonb — structured clause data), pdf_storage_path, generated_at, signed_at (nullable), signature_method (manual | singpass | esign_partner)

**rent_cycles** — one row per month of a tenancy
- id, tenancy_id (fk), due_date, amount_sgd, status (pending | paid | late | waived), paid_at (nullable), payment_reference (nullable), notes

**tickets** — maintenance issues
- id, tenancy_id (fk), reporter_id (fk users), title, description, severity (low | medium | high | urgent), responsibility (landlord | tenant | disputed | undetermined), status (new | triaged | in_progress | resolved | closed), ai_triage_data (jsonb), created_at

**ticket_messages** — conversation on a ticket
- id, ticket_id (fk), author_id (fk users, nullable for system), body, attachments (jsonb), created_at

**reminders** — scheduled outbound messages
- id, tenancy_id (fk), rent_cycle_id (fk, nullable), channel (whatsapp | email | sms), template_key, scheduled_for, sent_at (nullable), status (scheduled | sent | failed | cancelled), external_message_id (nullable)

**subscriptions** — Stripe subscription state, mirrored
- id, user_id (fk users), stripe_subscription_id, plan (free | pro | plus), status, current_period_end, properties_included

**audit_log** — for PDPA and dispute resolution
- id, actor_id (fk users, nullable), entity_type, entity_id, action, changes (jsonb), created_at

### Relations summary

- A **user** (landlord) owns many **properties**
- A **property** has many **tenancies** over time (one active at a time)
- A **tenancy** has one **tenancy_agreement** (with versions)
- A **tenancy** has many **rent_cycles** (one per month)
- A **tenancy** has many **tickets**
- A **rent_cycle** has zero or more **reminders**

### RLS policies (worth stating explicitly)

- `properties`: readable only by `owner_id`
- `tenancies`: readable by property owner OR tenant
- `tenancy_agreements`: readable by property owner OR tenant on that tenancy
- `rent_cycles`: readable by property owner OR tenant
- `tickets`: readable by property owner OR tenant on that tenancy
- `subscriptions`: readable only by user_id
- `audit_log`: readable only by user_id who is the actor OR a superuser role

---

## 3. Key flows

### 3.1 Signup → first property → first tenancy

```
Landing page CTA
  → /signup (email + password, or magic link)
  → Verify email
  → /onboarding/property (add first property)
  → /onboarding/tenancy (add tenant details + tenancy terms)
  → /onboarding/agreement (generate TA)
  → /dashboard (first-time state, guided tour)
```

Target time-to-first-value: **under 12 minutes.**

### 3.2 Generate tenancy agreement

```
Landlord fills tenancy form (property, tenant, dates, rent, deposit)
  → Selects clause presets (Diplomatic Clause? Minor Repair Clause threshold?)
  → POST /api/tenancy-agreements/generate
    → API route validates input (Zod)
    → Calls generateTenancyAgreement() prompt with structured input
    → Anthropic returns structured clause data (JSON)
    → API route validates output (Zod), renders to PDF (via server-side React PDF or Puppeteer)
    → Stores PDF in Supabase Storage
    → Creates tenancy_agreements row (status: draft)
  → Landlord reviews on-screen preview
  → Landlord clicks "Send to tenant" → email/WhatsApp with link
  → Tenant reviews → clicks "Accept" → signs
  → Status → signed
```

### 3.3 Rent reminder loop

```
Cron (Supabase scheduled Edge Function, hourly)
  → SELECT reminders WHERE scheduled_for <= NOW() AND status = 'scheduled'
  → For each:
    → Fetch tenancy, rent_cycle, tenant contact
    → Render template
    → Send via WhatsApp API
    → On success: mark sent, log external_message_id
    → On failure: retry with backoff, escalate to email fallback after 3 tries
    → Log to audit_log
```

Reminder schedule (default):
- T-3 days: gentle heads-up
- T-0 (due date, 09:00): "Rent is due today"
- T+3 (if unpaid): "Rent is 3 days late — reply to sort out"
- Landlord notification at T+3 also

### 3.4 Maintenance triage

```
Tenant taps "Report an issue" (PWA)
  → Uploads photo(s) + voice memo + description
  → POST /api/tickets/create
    → Save ticket (status: new)
    → Trigger Edge Function: triageTicket(ticket_id)
      → Fetch ticket + tenancy + agreement clauses
      → Call triage prompt (Sonnet)
        → Prompt classifies: severity, likely cause, responsibility per TA
        → Prompt generates: 3 diagnostic follow-up questions, suggested next action
      → Validate output (Zod)
      → Save ai_triage_data, set status: triaged
    → Notify landlord (WhatsApp + in-app)
  → Landlord reviews AI recommendation, accepts or overrides
  → Landlord takes action (contact tenant, book contractor)
```

### 3.5 IRAS annual report

Deferred to M8. Structure:
- User clicks "Generate IRAS pack" from settings
- Job runs: pulls all rent_cycles + expense entries for the tax year
- Renders PDF categorising rental income + deductible expenses
- Formatted to match IRAS BE form categories
- User downloads

---

## 4. Prompt architecture

All prompts live in `/packages/prompts/`. Structure:

```
/packages/prompts/
├── /tenancy-agreements
│   ├── generate.ts              # Main lease generator
│   ├── generate.eval.ts         # Eval suite
│   ├── generate.system.md       # System prompt (edit here, imported by generate.ts)
│   └── clauses/                 # Individual clause generators
│       ├── diplomatic.ts
│       ├── minor-repair.ts
│       └── ...
├── /tickets
│   ├── triage.ts
│   ├── triage.eval.ts
│   └── triage.system.md
├── /reminders
│   ├── compose.ts               # Composes personalised reminder text
│   └── compose.eval.ts
└── /shared
    ├── sg-context.md            # Reusable SG context block
    └── tone-guide.md            # Voice/tone rules for all outputs
```

### Prompt pattern

```typescript
// generate.ts (example shape, don't take literally)
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import systemPrompt from "./generate.system.md";
import { logPromptCall } from "@/packages/shared/prompt-logging";

const InputSchema = z.object({
  property: PropertySchema,
  tenancy: TenancySchema,
  clauses: ClauseSelectionSchema,
});

const OutputSchema = z.object({
  clauses: z.array(ClauseSchema),
  metadata: z.object({
    generatedFor: z.string(),
    templateVersion: z.string(),
  }),
});

export async function generateTenancyAgreement(
  input: z.infer<typeof InputSchema>
): Promise<z.infer<typeof OutputSchema>> {
  InputSchema.parse(input);

  const response = await anthropic.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 8000,
    system: systemPrompt,
    messages: [{ role: "user", content: JSON.stringify(input) }],
  });

  const parsed = OutputSchema.parse(JSON.parse(response.content[0].text));

  await logPromptCall({
    promptKey: "tenancy-agreements/generate",
    promptVersion: "1.0.0",
    input,
    output: parsed,
    modelUsage: response.usage,
  });

  return parsed;
}
```

### Eval pattern

- Every prompt has ≥5 test cases in `.eval.ts`
- Evals run in CI on any prompt change
- Eval output stored to `/docs/prompts/evals/YYYYMMDD-<prompt-key>.json`
- Fail the build if any eval regresses vs. the previous baseline

---

## 5. Integration wrappers

Every external API goes through a typed wrapper at `/packages/integrations/*`.

Rule: **no fetch() calls outside these files.** So we can (a) mock them in tests, (b) add rate limiting in one place, (c) swap vendors without rewriting features.

Files:
- `/packages/integrations/anthropic.ts`
- `/packages/integrations/whatsapp.ts` — wraps 360dialog or Twilio, exposes `sendMessage`, `sendTemplate`, `receiveWebhook`
- `/packages/integrations/stripe.ts`
- `/packages/integrations/paynow.ts` — QR generation only
- `/packages/integrations/resend.ts`
- `/packages/integrations/singpass.ts` — deferred to M6

---

## 6. Environments

- **Local dev:** Supabase local (via CLI) + Next.js on localhost:3000
- **Preview:** every PR gets a Vercel preview + a shared staging Supabase project
- **Production:** Vercel + Supabase (SG region)

Env var management:
- `.env.local` — local dev, gitignored
- `.env.example` — checked in, no values, documents required vars
- Vercel dashboard — production and preview
- Supabase secrets — for Edge Functions

---

## 7. Observability

- **Errors:** Sentry (client + server + Edge Functions)
- **Logs:** structured JSON to stdout, ingested by Vercel logs
- **Metrics:** PostHog events for product analytics; custom dashboards for MRR, WAL, etc.
- **Prompt cost tracking:** every AI call logged to a `prompt_calls` table with token counts and cost estimate
- **Uptime monitoring:** Better Uptime or Uptime Robot (free tier) hitting `/api/health`

---

## 8. Performance budgets

- Landing page LCP: <2.0s on 4G
- Dashboard TTI: <2.5s
- API routes: p95 <500ms (non-AI)
- AI routes: p95 <10s (with loading UI)
- Bundle size: <200kb JS on landing pages, <400kb on dashboard

Fail the build if any budget is exceeded by >20%.

---

## 9. Deferred / v2 decisions (write down so we don't argue about them each session)

- Native mobile: **deferred until 200 paying users OR clear PWA blocker**
- Singpass Agency integration: **application submitted M0, integrated M6 if approved**
- Contractor marketplace: **v2 (year 2)**
- Multi-currency: **never — SG only is the moat**
- Team accounts (agent multi-landlord): **v2 (year 2)**
- Escrow / custodial payments: **v3 or via partner, not built in-house**
- API for third parties: **v2, after we know what's actually stable**

---

## 10. Escape hatches (when things go wrong)

- **Anthropic API down:** all AI-generated content flows have a "manual" fallback — the user can compose or edit the content directly. No AI call should be a hard requirement to complete a task.
- **WhatsApp API down:** reminders fall back to email automatically, and to in-app notifications regardless.
- **Supabase down:** static marketing pages remain served (they're SSG). App shows a maintenance page.
- **Payments (Stripe) down:** display gracefully. Do not block existing users on their current period.
