-- 002 — Private profile reads, conversation membership lock, read-state-only updates
-- Audit findings H-3 (every profile readable by any authenticated user) and the
-- participant-insert hole that let any authenticated user add themselves to any
-- conversation and read its messages.
-- Idempotent.

begin;

-- ── Private profile reads ────────────────────────────────────────────────────
-- Restrictive policies AND with the existing permissive SELECT policy, so the
-- effective rule becomes: own row, or caller is an administrator.
-- The admin panel keeps working through is_admin(); RPCs that must read other
-- profiles (get_profiles_by_usernames, search_users_by_username) are
-- SECURITY DEFINER and unaffected.
drop policy if exists profiles_private_read_guard on public.profiles;
create policy profiles_private_read_guard on public.profiles
  as restrictive for select to anon, authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

-- ── Conversation membership ──────────────────────────────────────────────────
-- Direct client inserts into conversation_participants are denied. Direct
-- conversations are created by get_or_create_direct_conversation(), which is
-- SECURITY DEFINER and therefore not subject to this policy.
-- (A client-side insert previously allowed joining an arbitrary conversation.)
drop policy if exists participant_insert_guard on public.conversation_participants;
create policy participant_insert_guard on public.conversation_participants
  as restrictive for insert to anon, authenticated
  with check (false);

-- ── Read-state-only updates ──────────────────────────────────────────────────
create or replace function public.guard_read_state_only_updates()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin()
     and (to_jsonb(new) - array['is_read', 'read_at', 'updated_at', 'last_read_at'])
       is distinct from
         (to_jsonb(old) - array['is_read', 'read_at', 'updated_at', 'last_read_at']) then
    raise exception 'Only read state may be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_support_read_state on public.support_messages;
create trigger guard_support_read_state
  before update on public.support_messages
  for each row execute function public.guard_read_state_only_updates();

drop trigger if exists guard_message_read_state on public.messages;
create trigger guard_message_read_state
  before update on public.messages
  for each row execute function public.guard_read_state_only_updates();

create trigger guard_participant_read_state
  before update on public.conversation_participants
  for each row execute function public.guard_read_state_only_updates();

commit;
