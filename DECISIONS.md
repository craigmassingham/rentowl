# DECISIONS.md — Architecture Decision Records

> One entry per material technical decision. Newest first. Format: context → decision → consequences.

---

## ADR-003 — Hosted Supabase for Week 1 dev; local Supabase from Week 2

**Date:** 2026-07-10 · **Status:** accepted

**Context:** Local Supabase (`supabase start`) requires Docker Desktop, which isn't installed yet. Week 1 only needs Auth, not migrations.

**Decision:** Develop Week 1 against a free-tier hosted Supabase project (SG region). Install Docker and switch to `supabase start` + `supabase db reset` before ticket M1-W2-01 (schema migration), where local reset cycles matter.

**Consequences:** Auth email capture (Inbucket) unavailable in Week 1, so the Playwright E2E uses password auth with admin-API user confirmation; magic-link is tested manually until local Supabase exists.

---

## ADR-002 — Node installed from official tarball; pnpm via corepack

**Date:** 2026-07-10 · **Status:** accepted

**Context:** Dev machine had no Node, Homebrew, or version manager.

**Decision:** Node 22 LTS from the official nodejs.org tarball into `~/.local/node`, pnpm activated via corepack. No Homebrew dependency.

**Consequences:** Node upgrades are manual (replace the tarball). Revisit a version manager if multiple Node versions are ever needed.

---

## ADR-001 — No separate marketing app; route group inside apps/web

**Date:** 2026-07-10 · **Status:** accepted

**Context:** CLAUDE.md §6 sketches `/apps/marketing` but ARCHITECTURE.md already notes it "may merge into /web later".

**Decision:** Marketing pages live in `apps/web` under the `(marketing)` route group. Split into a separate app only if bundle-size budgets (ARCHITECTURE §8) or deploy cadence force it.

**Consequences:** One Vercel project, one deploy pipeline. Landing-page JS budget (<200kb) must be watched inside the shared app.
