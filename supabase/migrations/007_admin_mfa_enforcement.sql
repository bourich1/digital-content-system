-- 007 — Administrator MFA (aal2) enforcement
-- The Admin Panel route guard is not sufficient on its own. Every operation that
-- can only be performed by an administrator now also requires a session that has
-- proven a second factor, so a stolen password alone (aal1) cannot change roles,
-- access flags, platform settings, feature flags, tools, or read the audit trail.
--
-- Idempotent. Does not alter migrations 001–006 other than replacing the two
-- policies/functions that must become MFA-aware (same names, stricter bodies).
--
-- Prerequisite: TOTP MFA must be enabled for the project in Supabase Auth.

begin;

-- ── AAL-aware administrator predicate ────────────────────────────────────────
-- auth.jwt() carries the "aal" claim minted by Supabase Auth. A missing claim is
-- treated as aal1 so the check always fails closed.
create or replace function public.is_admin_aal2()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_admin()
     and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;

revoke all on function public.is_admin_aal2() from public;
grant execute on function public.is_admin_aal2() to anon, authenticated;

comment on function public.is_admin_aal2() is
  'True only when the caller is an administrator AND this session reached aal2 (two-factor verified).';

-- ── Privileged profile columns: role + aal2 ──────────────────────────────────
-- Self-escalation stays blocked exactly as in 001; an administrator changing a
-- protected field now additionally needs aal2.
create or replace function public.guard_profile_security_fields()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if new.id                 is distinct from old.id
    or new.role               is distinct from old.role
    or new.status             is distinct from old.status
    or new.can_access_tools   is distinct from old.can_access_tools
    or new.blocked_features   is distinct from old.blocked_features
    or new.email              is distinct from old.email
    or new.created_at         is distinct from old.created_at then
      if not public.is_admin() then
        raise exception 'Only administrators can change protected profile fields'
          using errcode = '42501';
      end if;
      if not public.is_admin_aal2() then
        raise exception 'Two-factor authentication is required to change protected profile fields'
          using errcode = '42501';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_security_fields on public.profiles;
create trigger guard_profile_security_fields
  before update on public.profiles
  for each row execute function public.guard_profile_security_fields();

-- ── Profiles: reading/writing other people's rows needs aal2 ─────────────────
-- Replaces the 002 read guard with the same rule plus MFA, so an aal1 admin
-- session can no longer enumerate the user table through PostgREST.
drop policy if exists profiles_private_read_guard on public.profiles;
create policy profiles_private_read_guard on public.profiles
  as restrictive for select to anon, authenticated
  using (id = (select auth.uid()) or (select public.is_admin_aal2()));

drop policy if exists profiles_admin_write_aal2 on public.profiles;
create policy profiles_admin_write_aal2 on public.profiles
  as restrictive for update to authenticated
  using ((select auth.uid()) = id or (select public.is_admin_aal2()))
  with check ((select auth.uid()) = id or (select public.is_admin_aal2()));

drop policy if exists profiles_admin_delete_aal2 on public.profiles;
create policy profiles_admin_delete_aal2 on public.profiles
  as restrictive for delete to authenticated
  using ((select public.is_admin_aal2()));

-- ── Administrator configuration tables: writes need aal2 ─────────────────────
-- Restrictive policies AND with the existing permissive admin policies, so no
-- new privilege is granted; an aal1 admin write is the only thing removed.
do $$
declare
  tbl text;
begin
  foreach tbl in array array['platform_settings', 'feature_flags', 'tools'] loop
    if exists (select 1 from pg_tables where schemaname = 'public' and tablename = tbl) then
      execute format('alter table public.%I enable row level security', tbl);

      execute format('drop policy if exists %I on public.%I', tbl || '_admin_aal2_insert', tbl);
      execute format(
        'create policy %I on public.%I as restrictive for insert to authenticated with check ((select public.is_admin_aal2()))',
        tbl || '_admin_aal2_insert', tbl
      );

      execute format('drop policy if exists %I on public.%I', tbl || '_admin_aal2_update', tbl);
      execute format(
        'create policy %I on public.%I as restrictive for update to authenticated using ((select public.is_admin_aal2())) with check ((select public.is_admin_aal2()))',
        tbl || '_admin_aal2_update', tbl
      );

      execute format('drop policy if exists %I on public.%I', tbl || '_admin_aal2_delete', tbl);
      execute format(
        'create policy %I on public.%I as restrictive for delete to authenticated using ((select public.is_admin_aal2()))',
        tbl || '_admin_aal2_delete', tbl
      );
    end if;
  end loop;
end $$;

-- ── Audit trail: reading it needs aal2 ───────────────────────────────────────
drop policy if exists admin_audit_log_admin_read on public.admin_audit_log;
create policy admin_audit_log_admin_read on public.admin_audit_log
  for select to authenticated
  using ((select public.is_admin_aal2()));

commit;

-- ── Verify after applying ────────────────────────────────────────────────────
--   select public.is_admin_aal2 from pg_proc where proname = 'is_admin_aal2';
--   select policyname, cmd, permissive from pg_policies
--    where tablename in ('profiles','platform_settings','feature_flags','tools','admin_audit_log')
--      and (policyname like '%aal2%' or policyname = 'admin_audit_log_admin_read');
--   -- must include profiles_private_read_guard, profiles_admin_write_aal2,
--   -- profiles_admin_delete_aal2, *_admin_aal2_insert/update/delete.
