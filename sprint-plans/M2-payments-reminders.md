# Month 2 — Payments Tracking + Reminders

**Goal:** Landlords can track monthly rent cycles, generate a PayNow QR for each cycle, and send automated WhatsApp reminders. Money still flows landlord ↔ tenant directly (no custody).

**Success criteria at end of M2:**
- All 5 M1 pilots have active rent cycles being tracked
- 5+ new pilots recruited (10 total)
- ≥1 real rent payment reconciled through the system
- WhatsApp reminders successfully delivered to at least 5 tenants
- Zero incidents where a reminder fired incorrectly (wrong amount, wrong recipient, wrong day)

**Time budget:** ~30 build hours

---

## Week 1 — Rent cycle model + generation

### Ticket M2-W1-01: Rent cycle generator

**Objective:** When a tenancy becomes active, auto-generate the full series of rent_cycles rows.

**Deliverables:**
- Server-side function `generateRentCycles(tenancyId)` that creates one row per month between start_date and end_date, using the tenancy's `payment_day`
- Handles edge case: payment_day = 31 → clamps to last day of month
- Handles edge case: tenancy starts mid-month → first cycle is prorated (calculated + noted as prorated in DB)
- Triggered on tenancy transition to `active` status
- Idempotent (re-running doesn't duplicate)

**Acceptance:**
- Unit tests: 12-month tenancy → 12 cycles, correct due dates
- Unit tests: 18-month tenancy starting mid-Jan with payment_day=15 → 18 cycles, first one prorated
- Editing tenancy dates regenerates cycles safely (with confirmation UI)

**Estimated Claude Code time:** 2.5 hours build + 30 min review

---

### Ticket M2-W1-02: Rent cycle list + mark-paid UX

**Objective:** Landlord sees all rent cycles per tenancy and can mark one as paid.

**Deliverables:**
- `/app/tenancies/[id]/rent` — table view: due date, amount, status, paid date, ref number, notes
- Mark-paid action opens a modal: paid date (default today), payment method (PayNow / bank transfer / cash / other), reference number, notes
- Undo-paid action (with audit_log entry)
- Filter: all / pending / paid / late
- Sort: due date desc by default

**Acceptance:**
- Marking paid updates status and `paid_at`
- Late detection: any pending cycle with due_date < today shows "late" badge
- Audit log records every state change

**Estimated Claude Code time:** 3 hours build + 30 min review

---

### Ticket M2-W1-03: PayNow QR generation

**Objective:** For each rent cycle, generate a PayNow QR the landlord can share with the tenant.

**Deliverables:**
- `/packages/integrations/paynow.ts` — generates the SGQR-compliant EMV-style payload
- Landlord adds PayNow-linked account info in Settings (mobile number OR NRIC/UEN — encrypted storage)
- QR includes: recipient (landlord's PayNow ID), amount (rent), reference (unique per cycle, e.g. `RENT-{tenancy_short_id}-{YYYYMM}`)
- Display QR in rent cycle detail modal + downloadable as PNG
- Tenant-side (M3): view QR on their PWA

**PayNow QR spec reference:** SGQR / EMV Merchant-Presented Mode. If Claude Code hits ambiguity, stop and ask Craig — this is a spec-heavy piece with real-money consequences.

**Acceptance:**
- Generated QR scans successfully in DBS, OCBC, UOB PayLah!, GXS Pay
- Amount and reference pre-fill correctly on scan
- QR renders on both desktop and mobile
- Landlord can regenerate if the reference needs to change

**Estimated Claude Code time:** 4 hours build + 1 hour testing across banks (Craig manual)

---

## Week 2 — WhatsApp integration

### Ticket M2-W2-01: WhatsApp Business API setup

**Objective:** Provider account live, first message sent from a Node script.

**Deliverables (Craig-led, Claude Code assists):**
- 360dialog or Twilio account created (recommend 360dialog for lower cost at low volume)
- WhatsApp Business number provisioned (Craig's decision: buy new SG number or port existing)
- Meta business verification submitted
- First message template submitted for approval (English, transactional category, no marketing)
- Sandbox testing works from a script

**Claude Code deliverables:**
- `/packages/integrations/whatsapp.ts` — typed wrapper with `sendTemplate(to, templateKey, variables)` and `sendMessage(to, text)` (session messages only within 24h window)
- Webhook receiver at `/api/webhooks/whatsapp` — verifies signature, stores inbound messages to `ticket_messages` or `whatsapp_inbox` table
- Env vars documented

**Acceptance:**
- Send-a-test-message action in an admin-only debug page works
- Webhook receives message events and logs them

**Estimated time:** Craig 4 hours (mostly waiting on Meta verification), Claude Code 2 hours

---

### Ticket M2-W2-02: Message templates

**Objective:** Define and submit the templates we'll send.

**Templates for M2:**

1. **rent_reminder_upcoming** (T-3 days)
   > Hi {{1}}, this is a friendly reminder that rent for {{2}} is due on {{3}}. Amount: S${{4}}. You can pay via PayNow using this reference: {{5}}. Reply here if you have any questions.

2. **rent_reminder_due** (T-0)
   > Hi {{1}}, rent for {{2}} is due today ({{3}}). Amount: S${{4}}. PayNow reference: {{5}}.

3. **rent_reminder_late** (T+3)
   > Hi {{1}}, rent for {{2}} was due on {{3}} (3 days ago). Amount: S${{4}}. Please arrange payment or reply here if there's an issue.

4. **rent_payment_confirmed**
   > Thanks {{1}}, we've recorded your rent payment for {{2}} ({{3}}) — S${{4}}. Have a good week.

5. **landlord_late_alert** (to landlord)
   > Heads up — rent from {{1}} for {{2}} is 3 days late (S${{3}}, was due {{4}}). Open in RentOwl to follow up.

**Deliverables:**
- Templates submitted via WhatsApp Business Manager
- Template registry in code: `/packages/integrations/whatsapp-templates.ts` (typed template keys + variables)
- Approval status tracked (once approved, mark usable)
- Preview UI showing what each template renders like

**Copy discipline:** No emoji in v1. No exclamation marks except "thanks". Match the bank-app tone.

**Acceptance:**
- All 5 templates approved by Meta (may take 24h–5 days)
- Registry exports typed helpers so a `templateKey` typo is a compile error

**Estimated time:** Craig 2 hours copy + submission, Claude Code 1 hour registry

---

### Ticket M2-W2-03: Reminder scheduling engine

**Objective:** Every rent cycle auto-schedules its reminders. A cron sends them.

**Deliverables:**
- When a rent cycle is created, schedule 3 reminders: T-3 (upcoming), T-0 09:00 (due), T+3 09:00 (late)
- Reminders stored in `reminders` table with `scheduled_for` and `template_key`
- Supabase scheduled Edge Function running every 15 min: `SELECT WHERE scheduled_for <= NOW() AND status='scheduled'`, sends each, updates status
- On send failure: retry with exponential backoff (max 3), then mark failed, email Craig
- On rent cycle marked paid before reminder fires: cancel remaining reminders
- Landlord late-alert also scheduled at T+3, targeted to landlord's WhatsApp

**Acceptance:**
- Integration test simulating clock advancement fires reminders correctly
- Marking a cycle paid cancels its future reminders
- End-to-end test with a real WhatsApp send to Craig's phone

**Estimated Claude Code time:** 4 hours build + 1 hour testing

---

## Week 3 — Payment matching + landlord dashboard

### Ticket M2-W3-01: Manual payment confirmation from WhatsApp reply

**Objective:** When a tenant replies "paid" to a reminder, surface it to the landlord for one-tap confirmation.

**Deliverables:**
- Inbound WhatsApp webhook classifies replies to reminder threads
- If the reply matches a "paid" intent (simple keyword matching for v1: "paid", "done", "transferred", "sent" — do NOT use AI for this in v1, too much risk of false positives), create a `payment_claim` on the associated rent cycle
- Landlord dashboard shows: "Tenant claims rent paid for {property} — confirm?" with tap-to-confirm CTA
- Confirming marks the cycle paid and triggers the confirmation reply template
- Rejecting sends a "no payment received yet" reply

**Explicit non-goal:** No bank integration in M2. Landlord manually checks their bank. This is deliberate — bank statement ingestion is M6 at earliest.

**Acceptance:**
- Craig tests end-to-end: tenant sends reminder, tenant replies "paid", Craig sees prompt on dashboard, confirms, tenant gets confirmation reply

**Estimated Claude Code time:** 3 hours build + 30 min review

---

### Ticket M2-W3-02: Dashboard v1.5 — payment status

**Objective:** Landlord dashboard now leads with rent status.

**Deliverables:**
- Top card: "This month" — X of Y rents received, list of outstanding
- Second card: "Upcoming this week" — reminders scheduled to fire
- Third card: "Attention needed" — late payments, rejected claims, failed sends
- Deprecate the M1 property-count card (move to secondary view)

**Acceptance:**
- Craig, as a landlord, can answer "am I owed rent right now?" in one glance
- Mobile layout: cards stack, most-important-first

**Estimated Claude Code time:** 2.5 hours build + 30 min review

---

### Ticket M2-W3-03: Settings — landlord payment profile

**Objective:** Landlord configures their PayNow details, WhatsApp number, reminder preferences.

**Deliverables:**
- `/app/settings/payments` — PayNow ID (mobile / NRIC / UEN), preferred display name
- `/app/settings/notifications` — reminder timing preferences (defaults are fine but let power users adjust: T-3, T-1, T-0, T+3, T+7)
- `/app/settings/profile` — landlord name, contact, WhatsApp number
- PayNow ID stored encrypted at rest (Supabase column encryption or app-layer)
- Changes to reminder schedule apply prospectively, not to already-scheduled reminders

**Acceptance:**
- Craig can update his PayNow ID and see it reflected in next-generated QR
- Encrypted at rest confirmed by inspecting the raw column value

**Estimated Claude Code time:** 2 hours build + 30 min review

---

## Week 4 — Recruit + iterate

### Ticket M2-W4-01: Recruit 5 more pilots

**Objective (Craig-led):**
- 5 additional landlords onboarded (target: mix of HDB and condo)
- Each has entered at least one active tenancy
- Each has scheduled reminders in the queue

**Sources:**
- Personal network (LinkedIn DMs to landlord friends)
- Facebook group post: "Building a Singapore landlord admin tool, looking for 5 more free pilot users"
- Ask M1 pilots for a referral

**Deliverables:**
- 5 new signups
- Kickoff calls done
- Documented in `/docs/user-research/M2/`

**Estimated Craig time:** 6 hours

---

### Ticket M2-W4-02: Iteration based on M1 feedback

**Objective:** Fix the top 3 pain points from M1 retro.

**Deliverables:**
- List of top 3 issues from M1 retro doc
- Ticketed and fixed
- Users notified (email or WhatsApp) with a "you asked, we fixed" note — this is a big trust-builder for a bootstrap product

**Estimated Claude Code time:** whatever's left in the week — plan for 4 hours

---

### Ticket M2-W4-03: M2 retro

Answer in `/docs/retros/M2.md`:

1. Did the reminders actually go out? Did any fire incorrectly?
2. How many actual rent payments were reconciled through the system?
3. Are the 10 pilots using the app weekly or has usage tailed off?
4. What's the biggest blocker to a landlord recommending this to another landlord?
5. Is the WhatsApp integration reliable enough to scale, or do we need to switch providers?
6. Cost tracking: what did WhatsApp + AI + hosting cost this month? Extrapolate to 100 users.
7. Update CLAUDE.md and ARCHITECTURE.md with anything learned.
