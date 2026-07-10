-- Local dev seed (M1-W2-01). Applied by `supabase db reset` via config.toml
-- [db.seed].sql_paths. Never runs in production.
--
-- Creates:
--   Landlord A (alicia) — 2 properties, 1 active tenancy on the HDB flat
--   Landlord B (ben)    — 1 property, exists so RLS tests can prove
--                          cross-user isolation
--
-- users_profile rows are created by the on_auth_user_created trigger.

-- ── Auth users ─────────────────────────────────────────────────────
-- Password for both: rentowl-dev-password
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated', 'authenticated',
    'alicia.landlord@rentowl.test',
    crypt('rentowl-dev-password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Alicia Wong"}',
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated', 'authenticated',
    'ben.landlord@rentowl.test',
    crypt('rentowl-dev-password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Ben Ng"}',
    now(), now(), '', '', '', ''
  );

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
values
  (
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    '{"sub":"11111111-1111-1111-1111-111111111111","email":"alicia.landlord@rentowl.test","email_verified":true}',
    'email', now(), now(), now()
  ),
  (
    gen_random_uuid(),
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    '{"sub":"22222222-2222-2222-2222-222222222222","email":"ben.landlord@rentowl.test","email_verified":true}',
    'email', now(), now(), now()
  );

-- ── Properties ─────────────────────────────────────────────────────
insert into public.properties (
  id, owner_id, address_line_1, address_line_2, postal_code,
  property_type, bedrooms, bathrooms, floor_area_sqft, notes
)
values
  (
    'aaaaaaaa-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'Blk 123 Bishan Street 13', '#08-123', '570123',
    'hdb', 3, 2, 1001, '4-room flat, near Bishan MRT'
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000002',
    '11111111-1111-1111-1111-111111111111',
    '8 Marina Boulevard', '#23-05', '018981',
    'condo', 2, 2, 850, null
  ),
  (
    'bbbbbbbb-0000-0000-0000-000000000001',
    '22222222-2222-2222-2222-222222222222',
    'Blk 456 Tampines Avenue 9', '#12-456', '520456',
    'hdb', 4, 2, 1184, 'Ben''s flat — exists for RLS isolation tests'
  );

-- ── Tenancy (active, on Alicia's HDB flat) ─────────────────────────
insert into public.tenancies (
  id, property_id, prospective_tenant, start_date, end_date,
  monthly_rent_sgd, deposit_sgd, payment_day, status
)
values (
  'cccccccc-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',
  '{"full_name":"Sarah Tan","email":"sarah.tan@example.com","phone":"+6591234567"}',
  date '2026-06-01', date '2027-05-31',
  3200.00, 3200.00, 1, 'active'
);
