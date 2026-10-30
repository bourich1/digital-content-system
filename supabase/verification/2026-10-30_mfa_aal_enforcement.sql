-- Safe verification for administrator two-factor enforcement (migration 007).
--
-- Nothing here changes data: every block ends in ROLLBACK, and the write test
-- asserts that the write is REJECTED. Run one block at a time in the Supabase
-- SQL editor. A block that raises an error has already rolled itself back.
--
-- Replace :admin_id with the id of an administrator account:
--   select id, email from public.profiles where role = 'admin';

-- ============================================================================
-- 1. Predicate: an aal1 administrator session must NOT be aal2.
--    Expect: role_is_admin = t, aal2_ok = f
-- ============================================================================
begin;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from public.profiles where role = 'admin' limit 1),
                    'role', 'authenticated', 'aal', 'aal1')::text, true);
select set_config('request.jwt.claim.sub',
  (select id::text from public.profiles where role = 'admin' limit 1), true);
select public.is_admin() as role_is_admin, public.is_admin_aal2() as aal2_ok;
rollback;

-- ============================================================================
-- 2. Predicate: the same account with an aal2 session must pass.
--    Expect: role_is_admin = t, aal2_ok = t
-- ============================================================================
begin;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from public.profiles where role = 'admin' limit 1),
                    'role', 'authenticated', 'aal', 'aal2')::text, true);
select set_config('request.jwt.claim.sub',
  (select id::text from public.profiles where role = 'admin' limit 1), true);
select public.is_admin() as role_is_admin, public.is_admin_aal2() as aal2_ok;
rollback;

-- ============================================================================
-- 3. A missing aal claim must fail closed.
--    Expect: aal2_ok = f
-- ============================================================================
begin;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from public.profiles where role = 'admin' limit 1),
                    'role', 'authenticated')::text, true);
select set_config('request.jwt.claim.sub',
  (select id::text from public.profiles where role = 'admin' limit 1), true);
select public.is_admin_aal2() as aal2_ok;
rollback;

-- ============================================================================
-- 4. RLS: an aal1 administrator session cannot read another user's profile.
--    Expect: other_profiles_visible = 0
-- ============================================================================
begin;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from public.profiles where role = 'admin' limit 1),
                    'role', 'authenticated', 'aal', 'aal1')::text, true);
select set_config('request.jwt.claim.sub',
  (select id::text from public.profiles where role = 'admin' limit 1), true);
set local role authenticated;
select count(*) as other_profiles_visible
from public.profiles
where id <> (select auth.uid());
rollback;

-- ============================================================================
-- 5. An aal1 administrator cannot change protected profile fields.
--    Expect: ERROR 42501 — Two-factor authentication is required...
-- ============================================================================

begin;

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select id from public.profiles where role = 'admin' limit 1),
    'role', 'authenticated',
    'aal', 'aal1'
  )::text,
  true
);

select set_config(
  'request.jwt.claim.sub',
  (select id::text from public.profiles where role = 'admin' limit 1),
  true
);

set local role authenticated;

update public.profiles
set status = 'suspended'
where id = auth.uid();

rollback;

-- ============================================================================
-- 6. RLS: an aal1 administrator session cannot flip a feature flag.
--    Expect: ERROR new row violates row-level security policy — refused.
-- ============================================================================
begin;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from public.profiles where role = 'admin' limit 1),
                    'role', 'authenticated', 'aal', 'aal1')::text, true);
select set_config('request.jwt.claim.sub',
  (select id::text from public.profiles where role = 'admin' limit 1), true);
set local role authenticated;
update public.feature_flags set enabled = not enabled
 where feature_name = (select feature_name from public.feature_flags limit 1);
rollback;

-- ============================================================================
-- 7. Ordinary account: self-update still works (no admin, no MFA involved).
--    Expect: UPDATE 1, and role/status unchanged afterwards.
-- ============================================================================
begin;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from public.profiles where role = 'user' limit 1),
                    'role', 'authenticated', 'aal', 'aal1')::text, true);
select set_config('request.jwt.claim.sub',
  (select id::text from public.profiles where role = 'user' limit 1), true);
set local role authenticated;
update public.profiles
   set full_name = coalesce(full_name, 'Verification check')
 where id = (select auth.uid());
select role, status from public.profiles where id = (select auth.uid());
rollback;

-- ============================================================================
-- 8. Ordinary account: self-escalation must still be refused (from 001).
--    Expect: ERROR 42501 — unchanged by this migration.
-- ============================================================================
begin;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from public.profiles where role = 'user' limit 1),
                    'role', 'authenticated', 'aal', 'aal2')::text, true);
select set_config('request.jwt.claim.sub',
  (select id::text from public.profiles where role = 'user' limit 1), true);
set local role authenticated;
update public.profiles set role = 'admin' where id = (select auth.uid());
rollback;
