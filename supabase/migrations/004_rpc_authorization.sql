-- 004 — RPC authorization fixes (P2 items 13 and 14)
-- * respond_to_collaboration: NULL partner_id no longer bypasses the check.
-- * search_users_by_username: exact match, minimum fields, per-caller throttle.
-- * get_or_create_direct_conversation: validates the target account exists.
-- Idempotent.

begin;

-- ── Throttle bookkeeping (not reachable through the API) ─────────────────────
create table if not exists public.rpc_rate_limit (
  user_id      uuid        not null,
  operation    text        not null,
  window_start timestamptz not null,
  calls        integer     not null default 0,
  primary key (user_id, operation)
);

alter table public.rpc_rate_limit enable row level security;
revoke all on public.rpc_rate_limit from public, anon, authenticated;

-- ── respond_to_collaboration ────────────────────────────────────────────────
create or replace function public.respond_to_collaboration(collab_id uuid, response_status text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_collab public.collaborations%rowtype;
  v_partner_username text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if response_status not in ('accepted', 'declined') then
    raise exception 'Unsupported response';
  end if;

  select * into v_collab from public.collaborations where id = collab_id;

  if v_collab.id is null then
    raise exception 'Collaboration not found';
  end if;

  -- A NULL partner_id must never satisfy this check.
  if v_collab.partner_id is null or v_collab.partner_id is distinct from auth.uid() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select username into v_partner_username from public.profiles where id = v_collab.partner_id;

  if response_status = 'accepted' then
    update public.collaborations set partner_status = 'accepted' where id = collab_id;

    insert into public.in_app_notifications (user_id, collab_id, title, message)
    values (
      v_collab.user_id,
      v_collab.id,
      'Collaboration Accepted',
      '@' || coalesce(v_partner_username, 'Someone') || ' accepted your collaboration request!'
    );
  else
    delete from public.collaborations where id = collab_id;

    insert into public.in_app_notifications (user_id, collab_id, title, message)
    values (
      v_collab.user_id,
      v_collab.id,
      'Collaboration Declined',
      '@' || coalesce(v_partner_username, 'Someone') || ' declined your collaboration request.'
    );
  end if;
end;
$$;

-- ── search_users_by_username ────────────────────────────────────────────────
-- Exact handle lookup only. The old ILIKE '%query%' returned the whole user
-- directory to any signed-in caller.
create or replace function public.search_users_by_username(search_query text)
returns table(id uuid, username text, full_name text, avatar_url text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_handle text := lower(btrim(leading '@' from btrim(coalesce(search_query, ''))));
  v_calls  integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if length(v_handle) < 2 then
    return;
  end if;

  insert into public.rpc_rate_limit (user_id, operation, window_start, calls)
  values (auth.uid(), 'search_users_by_username', date_trunc('minute', now()), 1)
  on conflict (user_id, operation) do update
    set calls = case
          when public.rpc_rate_limit.window_start = date_trunc('minute', now())
            then public.rpc_rate_limit.calls + 1
          else 1
        end,
        window_start = date_trunc('minute', now())
  returning calls into v_calls;

  if v_calls > 30 then
    raise exception 'Too many lookups. Try again in a minute.' using errcode = '53400';
  end if;

  return query
    select p.id, p.username, p.full_name, p.avatar_url
    from public.profiles p
    where lower(p.username) = v_handle
    limit 1;
end;
$$;

-- ── get_or_create_direct_conversation ───────────────────────────────────────
create or replace function public.get_or_create_direct_conversation(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user1   uuid;
  v_user2   uuid;
  v_hash    text;
  v_conv_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if target_user_id is null then
    raise exception 'Target user is required';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'Cannot create a direct conversation with yourself';
  end if;

  if not exists (select 1 from public.profiles where id = target_user_id) then
    raise exception 'Target account not found';
  end if;

  if auth.uid() < target_user_id then
    v_user1 := auth.uid();
    v_user2 := target_user_id;
  else
    v_user1 := target_user_id;
    v_user2 := auth.uid();
  end if;

  v_hash := v_user1::text || ':' || v_user2::text;

  select id into v_conv_id from public.conversations where participant_hash = v_hash;

  if v_conv_id is null then
    select cp1.conversation_id into v_conv_id
    from public.conversation_participants cp1
    join public.conversation_participants cp2 on cp1.conversation_id = cp2.conversation_id
    where cp1.user_id = v_user1 and cp2.user_id = v_user2;
  end if;

  if v_conv_id is not null then
    update public.conversations set participant_hash = v_hash
    where id = v_conv_id and participant_hash is null;
    return v_conv_id;
  end if;

  insert into public.conversations (participant_hash) values (v_hash)
  on conflict (participant_hash) do nothing;

  select id into v_conv_id from public.conversations where participant_hash = v_hash;

  if v_conv_id is null then
    raise exception 'Failed to create conversation';
  end if;

  insert into public.conversation_participants (conversation_id, user_id)
  values (v_conv_id, v_user1), (v_conv_id, v_user2)
  on conflict (conversation_id, user_id) do nothing;

  return v_conv_id;
end;
$$;

-- ── Privileges ──────────────────────────────────────────────────────────────
-- Re-pin search_path after the replacements above (CREATE OR REPLACE resets
-- function-level settings that were not repeated in the definition).
alter function public.respond_to_collaboration(uuid, text)  set search_path = public, pg_temp;
alter function public.search_users_by_username(text)        set search_path = public, pg_temp;
alter function public.get_or_create_direct_conversation(uuid) set search_path = public, pg_temp;
alter function public.get_profiles_by_usernames(text[])     set search_path = public, pg_temp;

revoke execute on function
  public.respond_to_collaboration(uuid, text),
  public.search_users_by_username(text),
  public.get_profiles_by_usernames(text[]),
  public.get_or_create_direct_conversation(uuid)
from public, anon;

grant execute on function
  public.respond_to_collaboration(uuid, text),
  public.search_users_by_username(text),
  public.get_profiles_by_usernames(text[]),
  public.get_or_create_direct_conversation(uuid)
to authenticated;

commit;
