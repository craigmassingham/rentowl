# Month 3 — AI Maintenance Triage (the differentiator)

**Goal:** Ship the AI triage feature that is your primary competitive differentiator vs. Zurently. Tenants can report issues from a PWA; AI classifies severity, likely cause, responsibility per the tenancy agreement, and drafts landlord next actions.

**Success criteria at end of M3:**
- Tenants at ≥5 pilot properties are actively using the tenant-side PWA
- At least 20 real maintenance tickets processed through triage
- Landlord agreement rate with AI triage (severity + responsibility) ≥80% (measured via override rate)
- No tickets have been mistriaged in a way that damaged trust (measured via user interviews)

**Time budget:** ~30 build hours

**Why this month matters most:** This is the moat. If the triage feels magical, RentOwl has a story no competitor can trivially copy. If it feels like a chatbot slapped on, we've built a worse Zurently. Do this well.

---

## Week 1 — Tenant PWA + ticket creation

### Ticket M3-W1-01: Tenant identity + invite flow

**Objective:** Landlord invites a tenant → tenant signs up via a link → tenant sees their tenancy.

**Deliverables:**
- Landlord action on tenancy: "Invite tenant" — generates a unique signup link + sends via WhatsApp/email
- Tenant lands on a stripped-down signup: name, email, phone, password
- On successful signup, the tenant `users` row is created, linked to the tenancy
- Tenant lands on `/tenant/dashboard` — a minimal view: their property, rent status, "Report an issue" CTA
- Tenant cannot see landlord data, cannot see other tenancies (RLS)

**Acceptance:**
- Invite → signup → dashboard round-trip works
- E2E test covers the flow
- Craig verifies as tenant that the experience feels dignified (not "second-class")

**Estimated Claude Code time:** 3 hours build + 30 min review

---

### Ticket M3-W1-02: Report an issue — the tenant flow

**Objective:** A tenant can report a maintenance issue in under 60 seconds from their phone.

**Deliverables:**
- `/tenant/report` route (PWA optimised)
- Form: title (optional), free-text description, category picker (aircon / plumbing / electrical / appliance / structural / pest / other), severity self-rating (can wait / soon / urgent), photo upload (multiple), optional voice memo (browser MediaRecorder API)
- Uploads go to Supabase Storage with tenant-scoped paths
- On submit: creates ticket row with status `new`, notifies landlord (WhatsApp + in-app)
- Post-submit: "Got it. We'll get back to you soon." — no false promises about timing

**Acceptance:**
- On a mid-range Android phone, tenant can report an aircon issue with 2 photos and a voice memo in <60 seconds
- Landlord gets a WhatsApp notification within 30 seconds of submission
- Photos are viewable on the landlord side
- Voice memos are playable (audio/webm or audio/mp4 depending on browser)

**Estimated Claude Code time:** 4 hours build + 1 hour mobile testing

---

### Ticket M3-W1-03: Ticket list + detail views (landlord side)

**Objective:** Landlord can see all tickets, drill into one, see everything.

**Deliverables:**
- `/app/tickets` — table: property, tenant, title, category, severity, status, created
- Filter: all, open, in-progress, resolved
- `/app/tickets/[id]` — detail: original report, photos, voice memo player, AI triage panel (empty until W2), message thread, status controls, action log
- Sortable by severity + recency

**Acceptance:**
- Landlord opens app, sees new ticket highlighted, opens it, sees all context in one screen
- No requirement to scroll horizontally on mobile

**Estimated Claude Code time:** 3 hours build + 30 min review

---

## Week 2 — The triage prompt (this is where it wins or loses)

### Ticket M3-W2-01: Triage prompt v1

**Objective:** The core AI triage that reads a ticket + tenancy context and produces structured recommendations.

**Deliverables:**
- `/packages/prompts/tickets/triage.system.md` — the system prompt (see design notes below)
- `/packages/prompts/tickets/triage.ts` — typed function
- `/packages/prompts/tickets/triage.eval.ts` — 15 test cases covering common SG rental scenarios

**Prompt design principles (read carefully — this is the whole game):**

The prompt must NOT be a chatbot personality. It must be a structured analyst producing:

```typescript
{
  severity: "low" | "medium" | "high" | "urgent",
  severity_reasoning: string, // 1 sentence, cite the specific concern
  category_confirmed: string, // may correct tenant's self-selection
  likely_causes: Array<{
    cause: string,
    likelihood: "high" | "medium" | "low",
    reasoning: string
  }>,
  responsibility: {
    party: "landlord" | "tenant" | "shared" | "unclear",
    reasoning: string, // reference specific TA clause if applicable
    clause_reference: string | null // e.g. "Minor Repair Clause, threshold S$200"
  },
  diagnostic_questions: string[], // 2-4 questions to ask the tenant to confirm
  suggested_next_actions: Array<{
    action: string,
    priority: "immediate" | "this_week" | "when_convenient",
    who: "landlord" | "tenant" | "contractor",
    est_cost_sgd_range: [number, number] | null
  }>,
  safety_flags: string[] // e.g. "possible gas leak — do not use appliance"
}
```

Context passed to prompt:
- Ticket description + category + severity + photo captions (M4 adds vision, M3 uses tenant-provided description)
- Property type (HDB / condo / landed)
- Tenancy clauses in force (including the Minor Repair Clause threshold if set)
- Tenancy age (fresh tenancy vs. 2 years in)
- Rent amount (as proxy for property tier)
- Location (Singapore) — hardcoded, but keep the placeholder for future

Model: **Sonnet.** Opus is overkill here and 5x the cost. If evals show quality gap, escalate to Opus for high-severity cases only.

Temperature: 0.2. This is analysis, not creativity.

**Eval cases must include:**
- Aircon not cooling, condo, 3-year-old tenancy → likely servicing overdue, tenant responsibility per Minor Repair Clause if under threshold
- Ceiling leak, HDB, upstairs neighbour → landlord responsibility, urgent, MSCT reference
- Pest infestation, condo, 1 week into tenancy → likely landlord responsibility (pre-existing), urgent
- Broken door handle, DIY-fixable → tenant responsibility (Minor Repair Clause), low severity
- Water heater not working, urgent (winter/rain) → landlord responsibility, urgent
- Aircon needs servicing (routine) → tenant responsibility per SG norm, low
- Suspected gas smell → **safety flag**, urgent, evacuate + call SP Group
- Chipped tile → cosmetic, low, tenant to document for handover
- Neighbour noise complaint → NOT a maintenance issue, redirect to MCST/HDB
- Wall mould in bathroom → shared responsibility likely, medium
- Plus 5 more from Craig's actual experience

**Acceptance:**
- All 15 evals pass with landlord-agreement judgement
- Output validates against Zod 100% of runs across 30 varied inputs
- Cost per triage <S$0.05
- Craig personally reviews 20 real-world outputs against his own judgement before shipping

**Estimated Claude Code time:** 5 hours prompt drafting + eval writing + 3 hours Craig iteration

---

### Ticket M3-W2-02: Triage execution pipeline

**Objective:** Every new ticket runs through triage automatically.

**Deliverables:**
- Supabase Edge Function `triage-ticket` triggered on ticket creation
- Fetches ticket + tenancy + agreement clauses + property context
- Calls triage prompt
- Persists output to `ticket.ai_triage_data`
- Sets ticket status → `triaged`
- Notifies landlord: "AI triaged the {property} {category} issue — {severity}"
- On triage failure (API error, validation failure): ticket stays `new`, landlord notified separately, no fake triage shown

**Acceptance:**
- New ticket → triaged status within 30 seconds
- Failed triage does not present stale/misleading data
- Retry mechanism for transient failures (max 2 retries)

**Estimated Claude Code time:** 3 hours build + 30 min review

---

## Week 3 — Landlord triage UI + override

### Ticket M3-W3-01: Triage UI on ticket detail

**Objective:** The AI's analysis is presented clearly on the ticket, and the landlord can accept or override each part.

**Deliverables:**
- Triage panel on `/app/tickets/[id]` showing:
  - Severity badge (AI-suggested + landlord override)
  - Responsibility recommendation with clause reference (click-through to view the clause text)
  - Likely causes ranked
  - Diagnostic questions with "Ask tenant" one-tap CTA
  - Suggested next actions with priority
  - Safety flags at the top in red if present
- Override controls for severity and responsibility (persist the override + reason)
- "Why did the AI say this?" expand shows reasoning verbatim
- Loud, unmissable disclaimer: "AI triage — final judgement is yours"

**Acceptance:**
- Landlord can accept the whole triage in one tap OR override any field
- Overrides are logged (this is training data for future prompt improvements)
- Safety flags cannot be dismissed without a confirmation

**Estimated Claude Code time:** 4 hours build + 1 hour design review (this is user-visible AI, high stakes for trust)

---

### Ticket M3-W3-02: Ask tenant a diagnostic question

**Objective:** The "Ask tenant" CTA sends the diagnostic question via WhatsApp and captures the reply back into the ticket.

**Deliverables:**
- Clicking a diagnostic question on the triage panel opens a compose modal with the question pre-filled and editable
- Sends via WhatsApp (session message if within 24h of last inbound, else uses a `ticket_followup` approved template)
- Reply captured back into ticket message thread via webhook
- Message thread on ticket detail: chronological, distinguishes system / landlord / tenant / AI

**Acceptance:**
- End-to-end: landlord opens triaged ticket, taps diagnostic Q, tenant receives on WhatsApp, replies, reply shows in ticket thread

**Estimated Claude Code time:** 3 hours build + 30 min review

---

### Ticket M3-W3-03: Ticket status workflow

**Objective:** Tickets flow through: new → triaged → in_progress → resolved → closed.

**Deliverables:**
- Landlord actions: "Start work", "Mark resolved", "Close ticket"
- "Start work" prompts: who's handling (self / contractor name), estimated completion
- "Mark resolved" prompts: what was done, cost incurred (goes to expense tracker later), photos of completion
- Tenant is notified on each status change
- Closed tickets are archived but searchable

**Acceptance:**
- Full lifecycle works end-to-end
- Reopening a closed ticket possible (with reason)

**Estimated Claude Code time:** 2.5 hours build + 30 min review

---

## Week 4 — Real-world triage validation + external launch prep

### Ticket M3-W4-01: Real-world triage validation

**Objective (Craig-led):** Actually test whether the triage is trustworthy.

**Deliverables:**
- Manually create 10 tickets on Craig's own property (real or contrived) — mix of severities, mix of categories
- Have 2 friend-landlords do the same on their pilot accounts (5 tickets each)
- Score each triage output: was severity right? was responsibility right? was next action sensible?
- If overall accuracy <80%, do NOT expand triage to more users. Iterate the prompt.
- If 80–90%, expand cautiously with a disclaimer.
- If >90%, expand and start collecting data as marketing evidence.

**Documentation:**
- `/docs/prompts/evals/M3-real-world-triage.md` — table of 20 tickets, AI output, human judgement, agreement/disagreement, root cause of disagreements

**Estimated Craig time:** 6 hours

---

### Ticket M3-W4-02: Recruit 5 more pilots (target: 15 total)

**Objective:** Broaden the base ahead of M4 public launch.

**Deliverables:**
- 5 more landlords, ideally including 1 or 2 "cold" signups (not from Craig's network) — see if the value prop is strong enough to attract strangers
- Ideally 3 of the 5 activate tenants on the tenant PWA

**Estimated Craig time:** 5 hours

---

### Ticket M3-W4-03: Draft the M4 launch page

**Objective:** Prepare the landing page for M4 external launch.

**Deliverables:**
- Hero: "The rental admin that handles itself" + 1-line subhead + waitlist CTA (or direct signup)
- 3 core benefits with real screenshots
- "How it compares" section (be direct: name the alternatives, cite what we do differently)
- Testimonial from Craig himself + at least 2 pilots (with permission)
- Pricing table
- FAQ (10 questions)
- Footer with legal, contact, privacy

**Craig owns the copy.** Claude Code owns the implementation.

**Estimated time:** Craig 4 hours copy, Claude Code 3 hours implementation

---

### Ticket M3-W4-04: M3 retro

Answer in `/docs/retros/M3.md`:

1. What was the actual triage accuracy over 20 real-world tickets?
2. What are the top 3 failure modes of the triage prompt?
3. Which categories does it handle well? Which does it struggle with?
4. Would a landlord recommend this feature to another landlord? (Ask 5 directly.)
5. Cost per triage in production — extrapolate to 500 users, 20 tickets/mo each.
6. Are tenants adopting the PWA or falling back to WhatsApp?
7. Is the moat thesis holding? Update the pitch.
8. Update CLAUDE.md and ARCHITECTURE.md.
