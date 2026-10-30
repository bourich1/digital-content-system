-- Safe verification for comprehensive security hardening (migration 008).
--
-- Every test block ends in ROLLBACK so nothing is written to the database.
-- Run in the Supabase SQL editor to verify policy enforcement.

-- ============================================================================
-- 1. verify_admin_access(): true for admin, false for user
-- ============================================================================
begin;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from public.profiles where role = 'admin' limit 1),
                    'role', 'authenticated', 'aal', 'aal2')::text, true);
select set_config('request.jwt.claim.sub',
  (select id::text from public.profiles where role = 'admin' limit 1), true);
set local role authenticated;
select public.verify_admin_access() as admin_check_should_be_true;
rollback;

begin;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from public.profiles where role = 'user' limit 1),
                    'role', 'authenticated', 'aal', 'aal1')::text, true);
select set_config('request.jwt.claim.sub',
  (select id::text from public.profiles where role = 'user' limit 1), true);
set local role authenticated;
select public.verify_admin_access() as user_check_should_be_false;
rollback;

-- ============================================================================
-- 2. Business logic protection: normal user cannot patch points or streak
--    Expect: ERROR 42501
-- ============================================================================
begin;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from public.profiles where role = 'user' limit 1),
                    'role', 'authenticated', 'aal', 'aal1')::text, true);
select set_config('request.jwt.claim.sub',
  (select id::text from public.profiles where role = 'user' limit 1), true);
set local role authenticated;

-- Should fail: points are protected
update public.profiles
set points = 999999
where id = auth.uid();
rollback;

-- ============================================================================
-- 3. Verified RPC: record_focus_session() works for user
-- ============================================================================
begin;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from public.profiles where role = 'user' limit 1),
                    'role', 'authenticated', 'aal', 'aal1')::text, true);
select set_config('request.jwt.claim.sub',
  (select id::text from public.profiles where role = 'user' limit 1), true);
set local role authenticated;

select public.record_focus_session(25);
select focus_sessions, points from public.profiles where id = auth.uid();
rollback;

-- ============================================================================
-- 4. Collaborations IDOR: Partner cannot delete or forge owner's collaboration
-- ============================================================================
begin;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from public.profiles where role = 'user' limit 1),
                    'role', 'authenticated', 'aal', 'aal1')::text, true);
select set_config('request.jwt.claim.sub',
  (select id::text from public.profiles where role = 'user' limit 1), true);
set local role authenticated;

-- Forgery check: Inserting a collaboration with someone else's user_id must fail check
-- Expect: ERROR new row violates row-level security policy for table "collaborations"
insert into public.collaborations (user_id, title)
values ('00000000-0000-0000-0000-000000000000'::uuid, 'Forged collaboration');
rollback;

-- ============================================================================
-- 5. Support Message Sender Integrity: sender_id must match auth.uid()
-- ============================================================================
begin;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from public.profiles where role = 'user' limit 1),
                    'role', 'authenticated', 'aal', 'aal1')::text, true);
select set_config('request.jwt.claim.sub',
  (select id::text from public.profiles where role = 'user' limit 1), true);
set local role authenticated;

-- Forgery check: Cannot send message pretending to be another sender_id
-- Expect: ERROR new row violates row-level security policy
insert into public.support_messages (user_id, sender_id, content)
values (auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid, 'Forged message');
rollback;

-- ============================================================================
-- 6. RPC rate limit: verify rate limit recording
-- ============================================================================
begin;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from public.profiles where role = 'user' limit 1),
                    'role', 'authenticated', 'aal', 'aal1')::text, true);
select set_config('request.jwt.claim.sub',
  (select id::text from public.profiles where role = 'user' limit 1), true);
set local role authenticated;

select public.get_profiles_by_usernames(array['test']);
select operation, calls from public.rpc_rate_limit where user_id = auth.uid();
rollback;

