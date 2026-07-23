-- Hotfix: backfill users_profile for auth.users rows created before the
-- on_auth_user_created trigger existed on this database (e.g. production
-- accounts that signed up before the initial schema migration was pushed).
-- Without this, any FK referencing users_profile(id) — properties.owner_id,
-- tenancies.tenant_id, tickets.reporter_id, etc. — fails for those users
-- with a foreign-key violation (silently, since app code doesn't log the
-- raw Postgrest error — see also the actions.ts logging follow-up).
--
-- Idempotent: only inserts rows missing a profile. Safe no-op on
-- environments where every auth.users row already has one (e.g. local dev,
-- where the trigger has always existed).
insert into public.users_profile (id, email, full_name)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'full_name', '')
from auth.users u
left join public.users_profile p on p.id = u.id
where p.id is null;
