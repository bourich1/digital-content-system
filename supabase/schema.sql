-- =============================================================================
-- DIGITAL CONTENT SYSTEM — COMPLETE DATABASE SCHEMA (single source of truth)
-- =============================================================================
-- All statements are idempotent (IF NOT EXISTS / OR REPLACE / ON CONFLICT).
-- Safe to run multiple times.
--
-- This file is the authoritative schema. Since 2026-10-30 it also contains the
-- hardening migrations inline, so a fresh install never passes through the old
-- vulnerable policy set. The same deltas are kept as ordered, individually
-- runnable files in supabase/migrations/ for existing databases:
--   001 profile self-escalation guard
--   002 private profile reads, conversation membership, read-state guards
--   003 SECURITY DEFINER search_path pinning, legacy table containment
--   004 RPC authorization, exact-match user lookup with throttling
--   005 append-only admin audit log
--   006 avatars bucket hardening
-- Run the migrations in order on an existing project; run this file for a new one.
-- =============================================================================

-- ── Extensions ───────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- =============================================================================
-- TABLES
-- =============================================================================

-- ── Profiles ─────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  role text check (role in ('user', 'admin')) default 'user' not null,
  status text check (status in ('active', 'suspended')) default 'active' not null,
  full_name text,
  username text unique,
  bio text,
  email text,
  avatar_url text,
  domain_industry text,
  occupation text,
  day_streak integer default 0,
  work_hours integer default 0,
  focus_sessions integer default 0,
  points integer default 0,
  cover_gradient text default 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)',
  theme_preference text check (theme_preference in ('light', 'dark', 'system')) default 'system',
  notifications_enabled boolean default true,
  survey_completed boolean default false,
  can_access_tools boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ── Onboarding Surveys ───────────────────────────────────────────────────────
create table if not exists public.onboarding_surveys (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  source text,
  primary_goal text,
  additional_info text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ── Creators ─────────────────────────────────────────────────────────────────
create table if not exists public.creators (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  profile_url text,
  platform text check (platform in ('YouTube', 'Instagram', 'TikTok', 'X', 'Other')) not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ── Content Ideas ────────────────────────────────────────────────────────────
create table if not exists public.content_ideas (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  status text check (status in ('Idea', 'Script', 'Filmed', 'Edited', 'Ready', 'Posted')) default 'Idea' not null,
  source_url text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ── Analytics ────────────────────────────────────────────────────────────────
create table if not exists public.analytics (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  video_title text not null,
  views integer default 0,
  likes integer default 0,
  comments integer default 0,
  date date default current_date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ── Platform Settings ────────────────────────────────────────────────────────
create table if not exists public.platform_settings (
  id text primary key,
  setting_value jsonb not null default '{}'::jsonb
);

insert into public.platform_settings (id, setting_value)
values ('tools_page', '{"enabled": true}')
on conflict (id) do nothing;

-- ── Tools ────────────────────────────────────────────────────────────────────
create table if not exists public.tools (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  url text not null,
  description text,
  logo_url text,
  category text default 'Other',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ── Tasks ────────────────────────────────────────────────────────────────────
create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  is_completed boolean default false,
  category text,
  priority text,
  due_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ── Collaborations ───────────────────────────────────────────────────────────
create table if not exists public.collaborations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  target_audience text,
  content_type text,
  goal text,
  notes text,
  status text default 'planned',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ── Collaboration Images ─────────────────────────────────────────────────────
create table if not exists public.collaboration_images (
  id uuid default gen_random_uuid() primary key,
  collaboration_id uuid references public.collaborations(id) on delete cascade,
  url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- ── Admin Check ──────────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ── Auto-Create Profile on Signup ────────────────────────────────────────────
-- NOTE: Uses ON CONFLICT DO NOTHING so existing profiles (e.g. admin) are never
-- overwritten with default values.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all tables
alter table if exists public.profiles enable row level security;
alter table if exists public.onboarding_surveys enable row level security;
alter table if exists public.creators enable row level security;
alter table if exists public.content_ideas enable row level security;
alter table if exists public.analytics enable row level security;
alter table if exists public.platform_settings enable row level security;
alter table if exists public.tools enable row level security;
alter table if exists public.tasks enable row level security;
alter table if exists public.collaborations enable row level security;
alter table if exists public.collaboration_images enable row level security;

-- ── Profiles ─────────────────────────────────────────────────────────────────
-- Reads: own row or administrator (the restrictive guard below enforces the
-- same rule against any broader permissive policy added later).
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile" on public.profiles
  for select using (auth.uid() = id);

-- A user may edit their own row, but only the trigger below decides which
-- columns; WITH CHECK keeps the row identity pinned.
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Admins can do everything on profiles" on public.profiles;
create policy "Admins can do everything on profiles" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- Authorization fields (role, status, access flags, email) are not writable by
-- ordinary accounts, regardless of what the client sends.
create or replace function public.guard_profile_security_fields()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    if new.id               is distinct from old.id
    or new.role             is distinct from old.role
    or new.status           is distinct from old.status
    or new.can_access_tools is distinct from old.can_access_tools
    or new.blocked_features is distinct from old.blocked_features
    or new.email            is distinct from old.email
    or new.created_at       is distinct from old.created_at then
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

drop policy if exists profiles_no_client_insert on public.profiles;
create policy profiles_no_client_insert on public.profiles
  as restrictive for insert to anon, authenticated
  with check (false);

drop policy if exists profiles_private_read_guard on public.profiles;
create policy profiles_private_read_guard on public.profiles
  as restrictive for select to anon, authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

-- ── Onboarding Surveys ───────────────────────────────────────────────────────
drop policy if exists "Users can view their own surveys" on public.onboarding_surveys;
create policy "Users can view their own surveys" on public.onboarding_surveys
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own surveys" on public.onboarding_surveys;
create policy "Users can insert their own surveys" on public.onboarding_surveys
  for insert with check (auth.uid() = user_id);

drop policy if exists "Admins can do everything on surveys" on public.onboarding_surveys;
create policy "Admins can do everything on surveys" on public.onboarding_surveys
  for all using (public.is_admin());

-- ── Creators ─────────────────────────────────────────────────────────────────
drop policy if exists "Users can view their own creators" on public.creators;
create policy "Users can view their own creators" on public.creators
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own creators" on public.creators;
create policy "Users can insert their own creators" on public.creators
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own creators" on public.creators;
create policy "Users can update their own creators" on public.creators
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete their own creators" on public.creators;
create policy "Users can delete their own creators" on public.creators
  for delete using (auth.uid() = user_id);

drop policy if exists "Admins can do everything on creators" on public.creators;
create policy "Admins can do everything on creators" on public.creators
  for all using (public.is_admin());

-- ── Content Ideas ────────────────────────────────────────────────────────────
drop policy if exists "Users can view their own ideas" on public.content_ideas;
create policy "Users can view their own ideas" on public.content_ideas
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own ideas" on public.content_ideas;
create policy "Users can insert their own ideas" on public.content_ideas
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own ideas" on public.content_ideas;
create policy "Users can update their own ideas" on public.content_ideas
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete their own ideas" on public.content_ideas;
create policy "Users can delete their own ideas" on public.content_ideas
  for delete using (auth.uid() = user_id);

drop policy if exists "Admins can do everything on ideas" on public.content_ideas;
create policy "Admins can do everything on ideas" on public.content_ideas
  for all using (public.is_admin());

-- ── Analytics ────────────────────────────────────────────────────────────────
drop policy if exists "Users can view their own analytics" on public.analytics;
create policy "Users can view their own analytics" on public.analytics
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own analytics" on public.analytics;
create policy "Users can insert their own analytics" on public.analytics
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own analytics" on public.analytics;
create policy "Users can update their own analytics" on public.analytics
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete their own analytics" on public.analytics;
create policy "Users can delete their own analytics" on public.analytics
  for delete using (auth.uid() = user_id);

drop policy if exists "Admins can do everything on analytics" on public.analytics;
create policy "Admins can do everything on analytics" on public.analytics
  for all using (public.is_admin());

-- ── Platform Settings ────────────────────────────────────────────────────────
drop policy if exists "Settings are viewable by everyone" on public.platform_settings;
create policy "Settings are viewable by everyone" on public.platform_settings
  for select using (true);

drop policy if exists "Settings are updateable by admin only" on public.platform_settings;
create policy "Settings are updateable by admin only" on public.platform_settings
  for update using (is_admin());

-- ── Tools ────────────────────────────────────────────────────────────────────
drop policy if exists "Tools are viewable by everyone" on public.tools;
create policy "Tools are viewable by everyone" on public.tools
  for select using (true);

drop policy if exists "Tools are insertable by admin only" on public.tools;
create policy "Tools are insertable by admin only" on public.tools
  for insert with check (is_admin());

drop policy if exists "Tools are updateable by admin only" on public.tools;
create policy "Tools are updateable by admin only" on public.tools
  for update using (is_admin());

drop policy if exists "Tools are deletable by admin only" on public.tools;
create policy "Tools are deletable by admin only" on public.tools
  for delete using (is_admin());

-- ── Tasks ────────────────────────────────────────────────────────────────────
drop policy if exists "Users can manage their own tasks" on public.tasks;
create policy "Users can manage their own tasks" on public.tasks
  for all using (auth.uid() = user_id or is_admin());

-- ── Collaborations ───────────────────────────────────────────────────────────
drop policy if exists "Users can manage their own collaborations" on public.collaborations;
create policy "Users can manage their own collaborations" on public.collaborations
  for all using (auth.uid() = user_id or is_admin());

drop policy if exists "Users can manage their own collaboration images" on public.collaboration_images;
create policy "Users can manage their own collaboration images" on public.collaboration_images
  for all using (
    exists (
      select 1 from public.collaborations
      where id = collaboration_id and (user_id = auth.uid() or is_admin())
    )
  );

-- =============================================================================
-- SET ADMIN ROLE (run this AFTER schema is applied)
-- =============================================================================
-- Do this in the Supabase SQL editor while signed in as the project owner, with
-- the account's own user id (never commit an administrator address here):
-- update public.profiles set role = 'admin' where id = '<auth user uuid>';
-- Every such change is recorded in public.admin_audit_log (migration 005).

-- =============================================================================
-- HARDENING MIGRATIONS (mirror of supabase/migrations/001-006)
-- Applied in order and idempotent, so running this file alone produces
-- exactly the hardened state. Update both places when a rule changes.
-- =============================================================================
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
-- 003 — SECURITY DEFINER search_path pinning + legacy table containment
-- Audit findings H-5 (CWE-426 function resolution) and M-7 (USING(true) tables).
-- Idempotent.

begin;

-- ── Pin search_path on every SECURITY DEFINER function in public ─────────────
-- Done as a loop so it also covers functions added later in this migration and
-- any that were missed by the original reviewed script.
do $$
declare
  fn record;
begin
  for fn in
    select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
  loop
    execute format(
      'alter function %I.%I(%s) set search_path = public, pg_temp',
      fn.nspname, fn.proname, fn.args
    );
  end loop;
end $$;

-- ── Legacy commerce/catalog tables ───────────────────────────────────────────
-- These tables are not referenced anywhere in the application source. They are
-- locked to administrators instead of dropped, because a DROP is irreversible
-- and their contents cannot be inspected from the repository. The opt-in DROP
-- script lives in supabase/manual/drop_legacy_tables.sql.
do $$
declare
  tbl text;
  pol record;
begin
  foreach tbl in array array[
    'ads', 'categories', 'products', 'product_images', 'product_variants',
    'coupons', 'orders', 'order_items', 'content_items'
  ] loop
    if exists (select 1 from pg_tables where schemaname = 'public' and tablename = tbl) then
      execute format('alter table public.%I enable row level security', tbl);
      execute format('revoke all on public.%I from anon', tbl);

      for pol in
        select policyname from pg_policies where schemaname = 'public' and tablename = tbl
      loop
        execute format('drop policy %I on public.%I', pol.policyname, tbl);
      end loop;

      execute format(
        'create policy %I on public.%I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))',
        tbl || '_admin_only', tbl
      );
    end if;
  end loop;
end $$;

commit;
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
-- 005 — Append-only administrator audit trail (P2 item 10)
-- Records who changed role/status/access, platform settings, or feature flags,
-- with the request's IP and user agent when the change came through PostgREST.
-- Idempotent.

begin;

create table if not exists public.admin_audit_log (
  id           bigint generated always as identity primary key,
  actor        uuid,
  actor_email  text,
  action       text not null,
  target_table text not null,
  target       text,
  "before"     jsonb,
  "after"      jsonb,
  ip           text,
  user_agent   text,
  created_at   timestamptz not null default now()
);

create index if not exists admin_audit_log_created_at_idx on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_actor_idx      on public.admin_audit_log (actor);

alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from public, anon, authenticated;
grant select on public.admin_audit_log to authenticated;

drop policy if exists admin_audit_log_admin_read on public.admin_audit_log;
create policy admin_audit_log_admin_read on public.admin_audit_log
  for select to authenticated
  using ((select public.is_admin()));

-- ── Writer ──────────────────────────────────────────────────────────────────
create or replace function public.write_admin_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_headers jsonb := '{}'::jsonb;
  v_target  text;
  v_action  text;
begin
  begin
    v_headers := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  exception when others then
    v_headers := '{}'::jsonb;
  end;

  v_target := coalesce(
    to_jsonb(new) ->> 'id',
    to_jsonb(new) ->> 'feature_name',
    to_jsonb(new) ->> 'setting_key'
  );

  v_action := tg_table_name || '.' || lower(tg_op);

  insert into public.admin_audit_log
    (actor, actor_email, action, target_table, target, "before", "after", ip, user_agent)
  values (
    auth.uid(),
    (select p.email from public.profiles p where p.id = auth.uid()),
    v_action,
    tg_table_name,
    v_target,
    to_jsonb(old),
    to_jsonb(new),
    nullif(btrim(split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1)), ''),
    v_headers ->> 'user-agent'
  );

  return new;
end;
$$;

-- ── Triggers ────────────────────────────────────────────────────────────────
drop trigger if exists audit_profile_privileged_changes on public.profiles;
create trigger audit_profile_privileged_changes
  before update on public.profiles
  for each row
  when (
    old.role             is distinct from new.role
    or old.status        is distinct from new.status
    or old.can_access_tools is distinct from new.can_access_tools
    or old.blocked_features is distinct from new.blocked_features
    or old.email         is distinct from new.email
  )
  execute function public.write_admin_audit_log();

drop trigger if exists audit_platform_settings on public.platform_settings;
create trigger audit_platform_settings
  before update on public.platform_settings
  for each row execute function public.write_admin_audit_log();

drop trigger if exists audit_feature_flags on public.feature_flags;
create trigger audit_feature_flags
  before update on public.feature_flags
  for each row execute function public.write_admin_audit_log();

-- ── Append-only ─────────────────────────────────────────────────────────────
create or replace function public.deny_audit_log_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'admin_audit_log is append-only' using errcode = '42501';
end;
$$;

drop trigger if exists admin_audit_log_no_update on public.admin_audit_log;
create trigger admin_audit_log_no_update
  before update or delete on public.admin_audit_log
  for each row execute function public.deny_audit_log_mutation();

commit;
-- 006 — Avatars bucket hardening (P1 item 9, audit finding H-4)
-- * Bucket-level size and MIME limits (enforced by the storage API, not the UI).
-- * Insert path must be scoped to the caller's own user id.
-- * UPDATE/DELETE are owner-scoped, so no user can alter another user's object.
--
-- ORDER MATTERS: deploy the accompanying Settings.tsx change (upload path
-- becomes `<user id>/<file>`) before applying this file, otherwise new avatar
-- uploads are rejected by the path guard.
--
-- The ownership column has been named both `owner` and `owner_id` across
-- Supabase versions, so it is resolved dynamically. Idempotent.

begin;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

update storage.buckets
set file_size_limit   = 3145728,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
where id = 'avatars';

-- Remove the dashboard-generated wide-open policies (any caller could update or
-- delete any avatar object in the bucket).
do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname like 'avatars_all%'
  loop
    execute format('drop policy %I on storage.objects', pol.policyname);
  end loop;
end $$;

-- New uploads must live under `<auth.uid()>/...`.
drop policy if exists avatar_insert_path_guard on storage.objects;
create policy avatar_insert_path_guard on storage.objects
  as restrictive for insert to anon, authenticated
  with check (
    bucket_id <> 'avatars'
    or (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Owner-scoped UPDATE / DELETE, independent of which ownership column exists.
do $$
declare
  owner_col text;
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'storage' and table_name = 'objects' and column_name = 'owner_id'
  ) then
    owner_col := 'owner_id';
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'storage' and table_name = 'objects' and column_name = 'owner'
  ) then
    owner_col := 'owner';
  else
    owner_col := null;
  end if;

  drop policy if exists avatar_update_owner_guard on storage.objects;
  drop policy if exists avatar_delete_owner_guard on storage.objects;

  if owner_col is not null then
    execute format($p$
      create policy avatar_update_owner_guard on storage.objects
        as restrictive for update to anon, authenticated
        using (bucket_id <> 'avatars' or %1$I::text = (select auth.uid())::text or (select public.is_admin()))
        with check (bucket_id <> 'avatars' or %1$I::text = (select auth.uid())::text or (select public.is_admin()))
    $p$, owner_col);

    execute format($p$
      create policy avatar_delete_owner_guard on storage.objects
        as restrictive for delete to anon, authenticated
        using (bucket_id <> 'avatars' or %1$I::text = (select auth.uid())::text or (select public.is_admin()))
    $p$, owner_col);
  end if;
end $$;

commit;
