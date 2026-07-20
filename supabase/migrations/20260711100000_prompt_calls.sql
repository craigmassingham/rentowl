-- M1-W3-02: prompt_calls — telemetry for every AI call (ARCHITECTURE §7).
-- Logs prompt version, model, input hash, output, usage, and cost.
-- Raw inputs are NOT stored (PDPA: tenant PII stays out of telemetry);
-- input_hash allows dedup/correlation without retaining the payload.

create table public.prompt_calls (
  id uuid primary key default gen_random_uuid(),
  prompt_key text not null,
  prompt_version text not null,
  model text not null,
  input_hash text not null,
  output jsonb,
  usage jsonb,
  cost_usd numeric(10, 6),
  duration_ms integer,
  error text,
  created_at timestamptz not null default now()
);

create index prompt_calls_prompt_key_idx on public.prompt_calls (prompt_key, created_at);

-- Server-side telemetry only: service_role writes/reads, app roles get nothing
-- (ADR-004 — grants are explicit; RLS on with no policies denies by default).
alter table public.prompt_calls enable row level security;
grant all on public.prompt_calls to service_role;
