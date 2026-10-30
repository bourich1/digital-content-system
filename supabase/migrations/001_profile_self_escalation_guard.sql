-- 001 — Profile self-escalation guard (P0, audit finding C-2)
-- Prevents an ordinary signed-in account from changing authorization or
-- identity fields on its own profile row via PostgREST.
-- Idempotent. Safe to run on an existing database.
--
-- Verify after applying:
--   select tgname from pg_trigger where tgrelid = 'public.profiles'::regclass;
--   -- must include guard_profile_security_fields

begin;

-- Reads profiles without RLS recursion (owner is the table owner, so RLS is
-- bypassed inside the definer function). STABLE lets the planner optimise the
-- repeated calls made by RLS policies.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.guard_profile_security_fields()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  -- service_role, postgres and dashboard sessions are deliberately exempt so
  -- migrations and support tooling keep working.
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    if new.id                 is distinct from old.id
    or new.role               is distinct from old.role
    or new.status             is distinct from old.status
    or new.can_access_tools   is distinct from old.can_access_tools
    or new.blocked_features   is distinct from old.blocked_features
    or new.email              is distinct from old.email
    or new.created_at         is distinct from old.created_at then
      raise exception 'Only administrators can change protected profile fields'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_security_fields on public.profiles;
create trigger guard_profile_security_fields
  before update on public.profiles
  for each row execute function public.guard_profile_security_fields();

-- Close the INSERT path as well: profiles are only ever created by the
-- handle_new_user() definer trigger, never by an API client.
drop policy if exists profiles_no_client_insert on public.profiles;
create policy profiles_no_client_insert on public.profiles
  as restrictive for insert to anon, authenticated
  with check (false);

commit;
