# Month 4 — Polish, Pricing, Public Launch

**Goal:** Ship pricing, cross the bridge from free pilots to real paying customers, and go public.

**Success criteria at end of M4:**
- Stripe subscriptions live, at least 10 paying users converted
- Public landing page live, at least 30 signups from external sources
- MRR ≥ S$150 (10 users × ~S$15 effective average)
- Public launch post published on LinkedIn + at least 2 FB groups + 1 blog
- Zero payment-related bugs affecting real users

**Time budget:** ~30 build hours

---

## Week 1 — Renewal reminders + polish backlog

### Ticket M4-W1-01: Renewal reminders

**Objective:** Landlords are prompted 90 / 60 / 30 days before a tenancy ends.

**Deliverables:**
- Scheduled reminders auto-created for T-90, T-60, T-30 (landlord-only)
- Reminder content: "Tenancy at {property} ends on {date}. {tenant_name} — extend, renegotiate, or terminate?"
- One-tap action from reminder → opens `/app/tenancies/[id]/renewal`
- Renewal workflow: 3 buttons — Extend (opens form: new end date, same or new rent), Renegotiate (opens a note-taking + comms flow), Terminate (opens the move-out flow — stub for now, real move-out is M5)

**Acceptance:**
- Reminders fire on schedule for existing tenancies
- Extend path creates a new tenancy row linked to previous (or extends existing — decide + document)
- New TA can be generated from the renewal action

**Estimated Claude Code time:** 3 hours build + 30 min review

---

### Ticket M4-W1-02: Polish backlog burn-down

**Objective:** Clean up rough edges from M1–M3 that pilots have flagged.

**Approach:** Craig maintains a `/docs/polish-backlog.md` list. This week burns through the top 10 items.

**Categories:**
- UX friction (steps that took users longer than expected)
- Copy improvements (words that confused users)
- Mobile layout issues
- Empty states, error states, edge cases
- Small performance wins

**Estimated Claude Code time:** 5 hours (batched into 10 small PRs)

---

### Ticket M4-W1-03: Accessibility pass

**Objective:** WCAG 2.1 AA baseline. This matters for SG public sector visibility later and for professionalism now.

**Deliverables:**
- Automated axe-core audit run in CI on key routes
- Manual keyboard navigation test of core flows
- Colour contrast check on all custom components (Tailwind defaults usually pass — verify)
- Focus states visible everywhere
- Semantic HTML (no `<div onClick>`)
- Form labels on every input
- Skip-to-content link
- Screen reader test on signup + create property + generate TA

**Acceptance:**
- axe-core reports 0 critical, 0 serious issues on core routes
- Core flows completable with keyboard only

**Estimated Claude Code time:** 3 hours build + 1 hour Craig testing

---

## Week 2 — Stripe + pricing

### Ticket M4-W2-01: Stripe products + prices setup

**Objective:** Stripe configured to match the pricing model.

**Deliverables (Craig-led setup + Claude Code integration):**
- Stripe account activated for SG (already done or do now)
- 3 products created:
  - Free (S$0, up to 1 property)
  - Pro (S$18/property/month, annual S$180/property/year)
  - Plus (S$35/property/month, annual S$350/property/year)
- Metered by property count using Stripe usage-based billing (recommend `licensed` quantity model — simpler than usage records for our case)
- Trial: 14 days on Pro for new signups
- Discount codes possible for pilots

**Acceptance:**
- Products visible in Stripe dashboard
- Test-mode checkout works

**Estimated time:** Craig 2 hours setup, Claude Code 1 hour verification

---

### Ticket M4-W2-02: Subscription lifecycle

**Objective:** Users can subscribe, upgrade, downgrade, cancel, resume.

**Deliverables:**
- `/app/billing` — current plan, next invoice, payment method, past invoices (from Stripe portal)
- "Upgrade to Pro" CTA from various natural nudges (adding a 2nd property, hitting a paid-only feature)
- Stripe Customer Portal integration (Stripe hosts most of the billing UI — do not rebuild)
- Webhook receiver `/api/webhooks/stripe`: handles `customer.subscription.created`, `updated`, `deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
- Local `subscriptions` table mirrors Stripe state (source of truth is Stripe; local is read cache)
- Feature gating: adding a 2nd property when on Free triggers "upgrade or downgrade to fit"

**Acceptance:**
- Test-mode: signup → free plan active
- Add 2nd property → prompted to upgrade
- Complete Pro subscription → immediately unlocks 2nd property
- Cancel from Portal → status reflects in RentOwl within 60 seconds via webhook
- Failed payment triggers dunning email (Stripe handles most, we surface in-app)

**Estimated Claude Code time:** 5 hours build + 1 hour end-to-end testing

---

### Ticket M4-W2-03: Feature gating for Plus tier

**Objective:** AI triage is Plus-only. Pro users see a paywall. Free users don't see it at all.

**Deliverables:**
- Feature flags via PostHog OR a simple `plan_features` config in code
- Gated features (v1):
  - AI triage → Plus only
  - IRAS export → Plus only (v2 feature but flag now)
  - Priority support → Plus only (no code, marketing claim)
- Pro users creating a ticket see the AI-triage panel greyed out with "Available on Plus — upgrade" CTA
- Never full-feature-tease-then-block; either show or don't

**Acceptance:**
- Craig can toggle a user between Free / Pro / Plus and see the UI change
- Downgrading loses access at end of billing period, not immediately (grace period matters for trust)

**Estimated Claude Code time:** 3 hours build + 30 min review

---

## Week 3 — Marketing surface

### Ticket M4-W3-01: Public landing page

**Objective:** The M3-W4 draft goes live at rentowl.sg (or whatever domain Craig chooses).

**Deliverables:**
- Route: `/` (public), separate from `/app` (authenticated)
- Sections per M3-W4 draft: hero, benefits, how it compares, testimonials, pricing, FAQ, footer
- Signup CTA everywhere → `/signup`
- Mobile-first (60%+ of SG traffic will be mobile)
- Open Graph and Twitter card tags for social sharing
- Sitemap.xml and robots.txt
- Cookie/PDPA banner (minimal — we don't do behavioural tracking without consent)

**Performance:**
- LCP <2.0s on 4G
- Lighthouse ≥90 across all four categories

**Acceptance:**
- Lighthouse audit passes
- Craig approves visual + copy
- OG preview looks right on WhatsApp, LinkedIn, Twitter

**Estimated Claude Code time:** 5 hours build + 2 hours Craig design + copy review

---

### Ticket M4-W3-02: First 4 blog posts

**Objective:** Content that ranks (eventually) and answers real landlord questions.

**Deliverables (Craig writes, Claude Code publishes):**
- Blog engine: Next.js MDX at `/blog/[slug]`
- 4 posts:
  1. "Singapore tenancy agreements: every clause explained"
  2. "DIY landlord in Singapore: the S$2,400/year case against agents" (personal, Craig's story)
  3. "HDB subletting rules 2026: the unofficial landlord guide"
  4. "IRAS rental income tax: a 10-minute walkthrough"
- Each post: 1500–2500 words, real screenshots where relevant, Craig's byline, cross-links to relevant product pages
- SEO: proper title, meta description, H1, internal links, alt text on images
- Comments off (v1 — too much moderation overhead)

**Acceptance:**
- 4 posts live at launch
- Each is indexable, has structured data (Article schema), passes basic on-page SEO checks

**Estimated Craig time:** 12 hours writing (this is a lot but essential — this is the content moat)
**Estimated Claude Code time:** 2 hours MDX setup + publishing

---

### Ticket M4-W3-03: Waitlist → activation flow

**Objective:** If we decide to control launch pace with a waitlist, the flow works.

**Deliverables:**
- Waitlist DB table with email + source + notes
- Public signup can operate in two modes (via env var): "open signup" or "waitlist only"
- Waitlist email confirms + sets expectation ("we'll invite you within X days")
- Admin action: batch-invite N users off the waitlist
- Invite email routes to signup with a pre-filled code

**Craig's call:** open signup vs. waitlist. My recommendation: **open signup**, but with a soft cap (if signups exceed X/day, flip to waitlist mode via env var — no code deploy needed).

**Estimated Claude Code time:** 2 hours build + 30 min review

---

## Week 4 — Launch + measurement

### Ticket M4-W4-01: Launch communications

**Objective:** Coordinated launch across owned channels.

**Deliverables (Craig-led):**
- LinkedIn founder post: "I've spent 4 months evenings building RentOwl. Here's why, and here's what I built." — links to landing + 1 blog post
- Personal WhatsApp broadcast to landlord friends
- FB group posts (staged over the week, not simultaneously): "SG HDB / Condo Landlords" group, "Singapore Expats" group
- Reddit: honest post on r/singaporefi about the DIY landlord angle
- One media outreach: pitch to Tech in Asia or e27 ("VP of Design at Lazada builds solo AI startup in 4 months")
- Prepare + monitor comments for 48h post-launch

**Deliverables (Claude Code assists):**
- Analytics tagging so each launch channel is trackable (UTM params on all links)
- PostHog dashboard: signups by source

**Estimated Craig time:** 8 hours across the week

---

### Ticket M4-W4-02: Onboarding email sequence

**Objective:** New signups get a helpful email sequence (not a marketing barrage).

**Deliverables:**
- 5-email sequence via Resend, triggered by signup:
  - Day 0 (immediate): "Welcome. Here's how to add your first property in 3 minutes."
  - Day 1: "Have you generated your first TA? Here's a walkthrough."
  - Day 3: "How the rent reminders work — and when they'll fire."
  - Day 7: "You've been using RentOwl for a week — what's confusing? Reply and tell me." (from Craig personally)
  - Day 14: "Trial ends in 3 days — here's what you'd get on Pro." (only if on trial, else skip)
- All emails plain-text-feel (some HTML, minimal), no marketing template chrome
- Unsubscribe link honoured

**Acceptance:**
- New signup receives day-0 email within 60 seconds
- Emails don't render broken on Gmail iOS/Android/desktop, Outlook, Apple Mail
- Reply-to is Craig's email and replies actually reach him

**Estimated Claude Code time:** 2.5 hours build + Craig 2 hours copy

---

### Ticket M4-W4-03: MRR + growth dashboard

**Objective:** Craig has one place to see the numbers.

**Deliverables:**
- Admin-only route `/app/admin/metrics`
- Displays: total signups, WAL, MRR, paying users by plan, churn (basic), CAC by source (from UTM), 30-day trend
- Data source: PostHog + Stripe + Supabase joined
- Weekly cron: email Craig a Monday morning summary

**Acceptance:**
- Real numbers visible daily
- Weekly email arrives Mondays 08:00 SGT

**Estimated Claude Code time:** 3 hours build + 30 min review

---

### Ticket M4-W4-04: M4 retro + Q2 planning

Answer in `/docs/retros/M4.md`:

1. Signup counts by channel — what worked?
2. Conversion rate free → paid?
3. What broke on launch day?
4. Which persona is actually signing up? (Does it match our assumptions?)
5. Cost structure at current scale — extrapolate to 100 paying, 500 paying, 1000 paying.
6. Renewals: is anyone at day-90 or day-60 in trial? How's engagement?
7. Q2 planning: HDB-first vs. private-first — do we have enough data to pick?
8. Q2 hypothesis for the moat — is AI triage actually retaining users?
9. Do we need to raise? (Signal: paying growth outstripping Craig's time-budget.)
10. Update CLAUDE.md, ARCHITECTURE.md, ROADMAP.md.

---

## Post-M4: what comes next

Do not commit to M5–M12 tickets yet. What ships in M5 depends heavily on what M4 launch reveals. But directional priorities:

- **M5:** Move-out / handover flow (photo inventory, deposit reconciliation, inventory checklist) — often the messiest lifecycle moment
- **M6:** Singpass / Myinfo integration (if approved by then) — trust and speed win
- **M7:** IRAS annual pack — timed for December tax season awareness
- **M8:** Portfolio view + bulk actions for 3+ property landlords
- **M9:** First contractor partnerships (aircon + plumbing)
- **M10:** Revisit native app decision based on PWA data
- **M11:** Segment doubling-down (HDB or private)
- **M12:** Fundraise decision point

Update this as data comes in from M4.
