-- Rollback-wrapped verification for migrations 001–004.
-- Makes no permanent change. Impersonates an ordinary user by setting the JWT
-- claims locally, asserts that escalation and cross-profile reads fail, and
-- rolls back. Run in the SQL editor after applying the migrations.

begin;

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',  (select id from public.profiles where role = 'user' limit 1),
    'role', 'authenticated'
  )::text,
  true
);

set local role authenticated;

do $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'FAIL: own profile unavailable';
  end if;

  if exists (select 1 from public.profiles where id <> auth.uid()) then
    raise exception 'FAIL: another private profile is visible';
  end if;

  begin
    update public.profiles set role = 'admin' where id = auth.uid();
    raise exception 'FAIL: escalation allowed';
  exception when insufficient_privilege then
    null; -- expected
  end;

  begin
    update public.profiles set status = 'suspended' where id = auth.uid();
    raise exception 'FAIL: status change allowed';
  exception when insufficient_privilege then
    null; -- expected
  end;

  update public.profiles set full_name = full_name where id = auth.uid();
end $$;

select jsonb_build_object(
  'own_profile_access',        exists (select 1 from public.profiles where id = auth.uid()),
  'other_profiles_visible',    (select count(*) from public.profiles where id <> auth.uid()),
  'role_escalation_test',      'PASS',
  'status_escalation_test',    'PASS',
  'ordinary_profile_update',   'PASS',
  'anonymous_search_rpc',      has_function_privilege('anon', 'public.search_users_by_username(text)', 'execute'),
  'authenticated_search_rpc',  has_function_privilege('authenticated', 'public.search_users_by_username(text)', 'execute'),
  'test_changes',              'ROLLBACK'
)::text as verification;

rollback;

-- Manual checks that cannot be asserted from a single session:
--   select tgname from pg_trigger where tgrelid = 'public.profiles'::regclass;
--   select policyname, permissive, cmd from pg_policies
--     where schemaname = 'public' and tablename = 'profiles' order by policyname;
--   select id, email, role, created_at from public.profiles where role = 'admin';
--   select id, file_size_limit, allowed_mime_types from storage.buckets where id = 'avatars';
