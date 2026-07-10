-- M1-W2-01: Initial schema — v1 core tables per ARCHITECTURE.md §2.
-- Tables: users_profile, properties, tenancies, tenancy_agreements,
--         rent_cycles, tickets, ticket_messages, reminders, audit_log
-- RLS on every table. No cascading deletes on user data (PDPA: deletion is
-- an explicit, audited flow — see SECURITY.md).

-- daterange exclusion constraint on tenancies needs btree_gist
create extension if not exists btree_gist;

-- ──────────────────────────────────────────────────────────────────
-- Enums
-- ──────────────────────────────────────────────────────────────────

create type public.user_role as enum ('landlord', 'tenant', 'both');
create type public.property_type as enum ('hdb', 'condo', 'landed');
create type public.tenancy_status as enum ('draft', 'active', 'ended', 'terminated');
create type public.agreement_status as enum ('draft', 'sent', 'signed', 'expired');
create type public.signature_method as enum ('manual', 'singpass', 'esign_partner');
create type public.rent_cycle_status as enum ('pending', 'paid', 'late', 'waived');
create type public.ticket_severity as enum ('low', 'medium', 'high', 'urgent');
create type public.ticket_responsibility as enum ('landlord', 'tenant', 'disputed', 'undetermined');
create type public.ticket_status as enum ('new', 'triaged', 'in_progress', 'resolved', 'closed');
create type public.reminder_channel as enum ('whatsapp', 'email', 'sms');
create type public.reminder_status as enum ('scheduled', 'sent', 'failed', 'cancelled');

-- ──────────────────────────────────────────────────────────────────
-- updated_at trigger
-- ──────────────────────────────────────────────────────────────────

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ──────────────────────────────────────────────────────────────────
-- Tables
-- ──────────────────────────────────────────────────────────────────

-- Profile row per auth user. auth.users is Supabase-owned; app data lives here.
create table public.users_profile (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  phone text,
  full_name text not null default '',
  singpass_id text,
  role public.user_role not null default 'landlord',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users_profile (id) on delete restrict,
  address_line_1 text not null,
  address_line_2 text,
  postal_code text not null check (postal_code ~ '^[0-9]{6}$'),
  property_type public.property_type not null,
  bedrooms smallint check (bedrooms >= 0),
  bathrooms smallint check (bathrooms >= 0),
  floor_area_sqft integer check (floor_area_sqft > 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index properties_owner_id_idx on public.properties (owner_id);

create table public.tenancies (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete restrict,
  -- Null until the tenant accepts an invite (M2). Until then, tenant details
  -- live in prospective_tenant (M1-W2-03).
  tenant_id uuid references public.users_profile (id) on delete restrict,
  prospective_tenant jsonb,
  start_date date not null,
  end_date date not null check (end_date > start_date),
  monthly_rent_sgd numeric(10, 2) not null check (monthly_rent_sgd > 0),
  deposit_sgd numeric(10, 2) not null default 0 check (deposit_sgd >= 0),
  payment_day smallint not null check (payment_day between 1 and 28),
  status public.tenancy_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One active tenancy per property at a time (ARCHITECTURE §2 relations)
  constraint tenancies_no_active_overlap exclude using gist (
    property_id with =,
    daterange(start_date, end_date, '[]') with &&
  ) where (status = 'active')
);

create index tenancies_property_id_idx on public.tenancies (property_id);
create index tenancies_tenant_id_idx on public.tenancies (tenant_id);
create index tenancies_status_idx on public.tenancies (status);

create table public.tenancy_agreements (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references public.tenancies (id) on delete restrict,
  version integer not null default 1 check (version >= 1),
  status public.agreement_status not null default 'draft',
  clauses jsonb not null default '[]'::jsonb,
  pdf_storage_path text,
  generated_at timestamptz not null default now(),
  signed_at timestamptz,
  signature_method public.signature_method,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenancy_id, version)
);

create index tenancy_agreements_tenancy_id_idx on public.tenancy_agreements (tenancy_id);

create table public.rent_cycles (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references public.tenancies (id) on delete restrict,
  due_date date not null,
  amount_sgd numeric(10, 2) not null check (amount_sgd > 0),
  status public.rent_cycle_status not null default 'pending',
  paid_at timestamptz,
  payment_reference text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenancy_id, due_date)
);

create index rent_cycles_tenancy_id_idx on public.rent_cycles (tenancy_id);
create index rent_cycles_due_date_status_idx on public.rent_cycles (due_date, status);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references public.tenancies (id) on delete restrict,
  reporter_id uuid not null references public.users_profile (id) on delete restrict,
  title text not null,
  description text not null default '',
  severity public.ticket_severity not null default 'medium',
  responsibility public.ticket_responsibility not null default 'undetermined',
  status public.ticket_status not null default 'new',
  ai_triage_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tickets_tenancy_id_idx on public.tickets (tenancy_id);
create index tickets_reporter_id_idx on public.tickets (reporter_id);
create index tickets_status_idx on public.tickets (status);

create table public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete restrict,
  -- Null author = system-generated message (e.g. AI triage note)
  author_id uuid references public.users_profile (id) on delete restrict,
  body text not null,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ticket_messages_ticket_id_idx on public.ticket_messages (ticket_id);
create index ticket_messages_author_id_idx on public.ticket_messages (author_id);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references public.tenancies (id) on delete restrict,
  rent_cycle_id uuid references public.rent_cycles (id) on delete restrict,
  channel public.reminder_channel not null default 'whatsapp',
  template_key text not null,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  status public.reminder_status not null default 'scheduled',
  external_message_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reminders_tenancy_id_idx on public.reminders (tenancy_id);
create index reminders_rent_cycle_id_idx on public.reminders (rent_cycle_id);
-- The hourly send loop queries: scheduled_for <= now() AND status = 'scheduled'
create index reminders_scheduled_idx on public.reminders (scheduled_for) where (status = 'scheduled');

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users_profile (id) on delete restrict,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  changes jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_actor_id_idx on public.audit_log (actor_id);
create index audit_log_entity_idx on public.audit_log (entity_type, entity_id);

-- updated_at triggers (audit_log is append-only, no updated_at)
create trigger set_updated_at before update on public.users_profile
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.properties
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.tenancies
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.tenancy_agreements
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.rent_cycles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.tickets
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.ticket_messages
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.reminders
  for each row execute function public.set_updated_at();

-- ──────────────────────────────────────────────────────────────────
-- Auto-create profile on signup
-- ──────────────────────────────────────────────────────────────────

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users_profile (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ──────────────────────────────────────────────────────────────────
-- RLS helpers
-- ──────────────────────────────────────────────────────────────────
-- security definer so policies can check ownership across tables without
-- recursively applying RLS (e.g. a tenant can see their tenancy without
-- having read access to the properties table).

create schema private;

create function private.is_property_owner(p_property_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.properties
    where id = p_property_id and owner_id = (select auth.uid())
  );
$$;

create function private.is_tenancy_owner(p_tenancy_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.tenancies t
    join public.properties p on p.id = t.property_id
    where t.id = p_tenancy_id and p.owner_id = (select auth.uid())
  );
$$;

create function private.is_tenancy_party(p_tenancy_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.tenancies t
    join public.properties p on p.id = t.property_id
    where t.id = p_tenancy_id
      and ((select auth.uid()) in (p.owner_id, t.tenant_id))
  );
$$;

grant usage on schema private to authenticated;
grant execute on all functions in schema private to authenticated;

-- ──────────────────────────────────────────────────────────────────
-- Table grants
-- ──────────────────────────────────────────────────────────────────
-- Default privileges don't include DML. RLS (below) is the row-level
-- authorization layer; these grants only open the tables to signed-in users.
-- anon gets nothing on purpose — no table here is publicly readable.

grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

-- ──────────────────────────────────────────────────────────────────
-- RLS policies (ARCHITECTURE §2)
-- ──────────────────────────────────────────────────────────────────

alter table public.users_profile enable row level security;
alter table public.properties enable row level security;
alter table public.tenancies enable row level security;
alter table public.tenancy_agreements enable row level security;
alter table public.rent_cycles enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.reminders enable row level security;
alter table public.audit_log enable row level security;

-- users_profile: own row only. Insert happens via the signup trigger.
create policy "users read own profile"
  on public.users_profile for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "users update own profile"
  on public.users_profile for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- properties: owner only, all operations
create policy "owners select own properties"
  on public.properties for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "owners insert own properties"
  on public.properties for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "owners update own properties"
  on public.properties for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "owners delete own properties"
  on public.properties for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

-- tenancies: readable by property owner OR tenant; writable by owner
create policy "parties select tenancies"
  on public.tenancies for select
  to authenticated
  using (
    (select auth.uid()) = tenant_id
    or private.is_property_owner(property_id)
  );

create policy "owners insert tenancies"
  on public.tenancies for insert
  to authenticated
  with check (private.is_property_owner(property_id));

create policy "owners update tenancies"
  on public.tenancies for update
  to authenticated
  using (private.is_property_owner(property_id))
  with check (private.is_property_owner(property_id));

create policy "owners delete tenancies"
  on public.tenancies for delete
  to authenticated
  using (private.is_property_owner(property_id));

-- tenancy_agreements: readable by owner OR tenant; writable by owner
create policy "parties select agreements"
  on public.tenancy_agreements for select
  to authenticated
  using (private.is_tenancy_party(tenancy_id));

create policy "owners insert agreements"
  on public.tenancy_agreements for insert
  to authenticated
  with check (private.is_tenancy_owner(tenancy_id));

create policy "owners update agreements"
  on public.tenancy_agreements for update
  to authenticated
  using (private.is_tenancy_owner(tenancy_id))
  with check (private.is_tenancy_owner(tenancy_id));

create policy "owners delete agreements"
  on public.tenancy_agreements for delete
  to authenticated
  using (private.is_tenancy_owner(tenancy_id));

-- rent_cycles: readable by owner OR tenant; writable by owner
create policy "parties select rent cycles"
  on public.rent_cycles for select
  to authenticated
  using (private.is_tenancy_party(tenancy_id));

create policy "owners insert rent cycles"
  on public.rent_cycles for insert
  to authenticated
  with check (private.is_tenancy_owner(tenancy_id));

create policy "owners update rent cycles"
  on public.rent_cycles for update
  to authenticated
  using (private.is_tenancy_owner(tenancy_id))
  with check (private.is_tenancy_owner(tenancy_id));

create policy "owners delete rent cycles"
  on public.rent_cycles for delete
  to authenticated
  using (private.is_tenancy_owner(tenancy_id));

-- tickets: readable by owner OR tenant; either party can report;
-- owner manages status/triage
create policy "parties select tickets"
  on public.tickets for select
  to authenticated
  using (private.is_tenancy_party(tenancy_id));

create policy "parties insert tickets"
  on public.tickets for insert
  to authenticated
  with check (
    (select auth.uid()) = reporter_id
    and private.is_tenancy_party(tenancy_id)
  );

create policy "owners update tickets"
  on public.tickets for update
  to authenticated
  using (private.is_tenancy_owner(tenancy_id))
  with check (private.is_tenancy_owner(tenancy_id));

-- ticket_messages: parties on the ticket's tenancy read and write
create policy "parties select ticket messages"
  on public.ticket_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_id and private.is_tenancy_party(t.tenancy_id)
    )
  );

create policy "parties insert ticket messages"
  on public.ticket_messages for insert
  to authenticated
  with check (
    (select auth.uid()) = author_id
    and exists (
      select 1 from public.tickets t
      where t.id = ticket_id and private.is_tenancy_party(t.tenancy_id)
    )
  );

-- reminders: owner only (tenants receive them, they don't manage them)
create policy "owners select reminders"
  on public.reminders for select
  to authenticated
  using (private.is_tenancy_owner(tenancy_id));

create policy "owners insert reminders"
  on public.reminders for insert
  to authenticated
  with check (private.is_tenancy_owner(tenancy_id));

create policy "owners update reminders"
  on public.reminders for update
  to authenticated
  using (private.is_tenancy_owner(tenancy_id))
  with check (private.is_tenancy_owner(tenancy_id));

create policy "owners delete reminders"
  on public.reminders for delete
  to authenticated
  using (private.is_tenancy_owner(tenancy_id));

-- audit_log: readable by the actor only; written server-side (service role
-- bypasses RLS), so no insert/update/delete policies for users
create policy "actors select own audit entries"
  on public.audit_log for select
  to authenticated
  using ((select auth.uid()) = actor_id);
