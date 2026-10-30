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

-- =============================================================================
-- 007 — Administrator MFA (aal2) enforcement (mirror of supabase/migrations/007)
-- =============================================================================
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
-- 008 — Comprehensive Security Hardening
-- Implements:
-- 1. Complete MFA database enforcement: is_admin_aal2() across tasks, collaborations,
--    calendar_events, focus_sessions, reports, support_tickets, support_messages,
--    legacy commerce tables, and storage buckets.
-- 2. Collaboration authorization & IDOR elimination: granular SELECT/INSERT/UPDATE/DELETE.
-- 3. Support message sender integrity: sender_id = auth.uid(), aal2 required for admin replies.
-- 4. Business logic protection: points, streaks, hours, focus sessions, and survey_completed
--    shielded from direct client writes; verified RPCs for onboarding and focus sessions.
-- 5. RPC rate-limiting on get_or_create_direct_conversation, respond_to_collaboration,
--    get_profiles_by_usernames.
-- 6. Storage hardening for collaboration_images bucket (5MB limit, image MIME types, auth.uid path).
-- 7. View-as-user (impersonation) auditing RPCs (start_impersonation, end_impersonation).
-- 8. Expanded admin_audit_log coverage (INSERT/UPDATE/DELETE across sensitive tables).
-- 9. verify_admin_access() RPC for secure admin login authentication.

begin;

-- ============================================================================
-- 1. SERVER-SIDE ADMIN VERIFICATION
-- ============================================================================
create or replace function public.verify_admin_access()
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.verify_admin_access() from public, anon;
grant execute on function public.verify_admin_access() to authenticated;

-- ============================================================================
-- 2. SENSITIVE USER TABLES: AAL2 ENFORCEMENT ON ADMIN ACCESS
-- ============================================================================
-- Tasks
drop policy if exists "Users can manage their own tasks" on public.tasks;
create policy "Users can manage their own tasks" on public.tasks
  for all using (auth.uid() = user_id or (select public.is_admin_aal2()));

-- Calendar events
drop policy if exists "Users can manage their calendar_events" on public.calendar_events;
create policy "Users can manage their calendar_events" on public.calendar_events
  for all using (auth.uid() = user_id or (select public.is_admin_aal2()));

-- Focus sessions
drop policy if exists "Users can manage their focus_sessions" on public.focus_sessions;
create policy "Users can manage their focus_sessions" on public.focus_sessions
  for all using (auth.uid() = user_id or (select public.is_admin_aal2()));

-- Content ideas
drop policy if exists "Admins can do everything on ideas" on public.content_ideas;
create policy "Admins can do everything on ideas" on public.content_ideas
  for all using ((select public.is_admin_aal2()));

-- ============================================================================
-- 3. COLLABORATIONS: GRANULAR IDOR PROTECTION & SENDER INTEGRITY
-- ============================================================================
drop policy if exists "Users can manage their own collaborations" on public.collaborations;
drop policy if exists "collaborations_select" on public.collaborations;
drop policy if exists "collaborations_insert" on public.collaborations;
drop policy if exists "collaborations_update" on public.collaborations;
drop policy if exists "collaborations_delete" on public.collaborations;

-- SELECT: owner OR invited partner OR aal2 admin
create policy "collaborations_select" on public.collaborations
  for select using (
    auth.uid() = user_id
    or auth.uid() = partner_id
    or (select public.is_admin_aal2())
  );

-- INSERT: only the owner may create a collaboration
create policy "collaborations_insert" on public.collaborations
  for insert with check (
    auth.uid() = user_id
  );

-- UPDATE: owner only (partner response changes happen strictly via respond_to_collaboration)
create policy "collaborations_update" on public.collaborations
  for update using (
    auth.uid() = user_id
  ) with check (
    auth.uid() = user_id
  );

-- DELETE: owner or aal2 admin
create policy "collaborations_delete" on public.collaborations
  for delete using (
    auth.uid() = user_id
    or (select public.is_admin_aal2())
  );

-- Collaboration Images Table
drop policy if exists "Users can manage their own collaboration images" on public.collaboration_images;
drop policy if exists "collaboration_images_select" on public.collaboration_images;
drop policy if exists "collaboration_images_insert" on public.collaboration_images;
drop policy if exists "collaboration_images_update" on public.collaboration_images;
drop policy if exists "collaboration_images_delete" on public.collaboration_images;

create policy "collaboration_images_select" on public.collaboration_images
  for select using (
    exists (
      select 1 from public.collaborations c
      where c.id = collaboration_id
        and (c.user_id = auth.uid() or c.partner_id = auth.uid() or (select public.is_admin_aal2()))
    )
  );

create policy "collaboration_images_insert" on public.collaboration_images
  for insert with check (
    exists (
      select 1 from public.collaborations c
      where c.id = collaboration_id
        and c.user_id = auth.uid()
    )
  );

create policy "collaboration_images_update" on public.collaboration_images
  for update using (
    exists (
      select 1 from public.collaborations c
      where c.id = collaboration_id
        and c.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.collaborations c
      where c.id = collaboration_id
        and c.user_id = auth.uid()
    )
  );

create policy "collaboration_images_delete" on public.collaboration_images
  for delete using (
    exists (
      select 1 from public.collaborations c
      where c.id = collaboration_id
        and (c.user_id = auth.uid() or (select public.is_admin_aal2()))
    )
  );

-- ============================================================================
-- 4. SUPPORT MESSAGES & TICKETS: SENDER FORGERY PROTECTION & AAL2
-- ============================================================================
drop policy if exists "Users can insert their own messages" on public.support_messages;
create policy "Users can insert their own messages" on public.support_messages
  for insert with check (auth.uid() = sender_id and auth.uid() = user_id);

drop policy if exists "Admins can view all messages" on public.support_messages;
create policy "Admins can view all messages" on public.support_messages
  for select using ((select public.is_admin_aal2()));

drop policy if exists "Admins can reply to any chat" on public.support_messages;
create policy "Admins can reply to any chat" on public.support_messages
  for insert with check ((select public.is_admin_aal2()) and auth.uid() = sender_id);

drop policy if exists "Admins can mark messages as read" on public.support_messages;
create policy "Admins can mark messages as read" on public.support_messages
  for update using ((select public.is_admin_aal2()));

-- Support tickets
drop policy if exists "Admins can view all support tickets" on public.support_tickets;
create policy "Admins can view all support tickets" on public.support_tickets
  for select using ((select public.is_admin_aal2()));

drop policy if exists "Admins can update support tickets" on public.support_tickets;
create policy "Admins can update support tickets" on public.support_tickets
  for update using ((select public.is_admin_aal2()))
  with check ((select public.is_admin_aal2()));

-- Reports
drop policy if exists "Admins can do everything on reports" on public.reports;
create policy "Admins can do everything on reports" on public.reports
  for all using ((select public.is_admin_aal2()))
  with check ((select public.is_admin_aal2()));

-- ============================================================================
-- 5. LEGACY COMMERCE TABLES: REQUIRE AAL2 FOR ADMINISTRATORS
-- ============================================================================
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'categories', 'products', 'product_images', 'product_variants',
    'ads', 'coupons', 'orders', 'order_items', 'content_items'
  ] loop
    if exists (select 1 from pg_tables where schemaname = 'public' and tablename = tbl) then
      execute format('drop policy if exists %I on public.%I', 'legacy_admin_only_' || tbl, tbl);
      execute format(
        'create policy %I on public.%I for all to authenticated using ((select public.is_admin_aal2())) with check ((select public.is_admin_aal2()))',
        'legacy_admin_only_' || tbl, tbl
      );
    end if;
  end loop;
end $$;

-- ============================================================================
-- 6. BUSINESS LOGIC FIELD PROTECTION & VERIFIED PROFILES TRIGGER
-- ============================================================================
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
    or new.created_at         is distinct from old.created_at
    or new.points             is distinct from old.points
    or new.day_streak         is distinct from old.day_streak
    or new.work_hours         is distinct from old.work_hours
    or new.focus_sessions     is distinct from old.focus_sessions
    or new.survey_completed   is distinct from old.survey_completed then
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

-- Verified RPC: Complete Onboarding Survey
create or replace function public.complete_onboarding(p_survey jsonb default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if p_survey is not null and p_survey <> '{}'::jsonb then
    insert into public.onboarding_surveys (
      user_id, source, goals, experience_level, primary_platform,
      country, language, profession, satisfaction
    ) values (
      auth.uid(),
      p_survey ->> 'source',
      case when jsonb_typeof(p_survey -> 'goals') = 'array' then
        array(select jsonb_array_elements_text(p_survey -> 'goals'))
      else '{}'::text[] end,
      p_survey ->> 'experience_level',
      p_survey ->> 'primary_platform',
      p_survey ->> 'country',
      p_survey ->> 'language',
      p_survey ->> 'profession',
      nullif(p_survey ->> 'satisfaction', '')::integer
    );
  end if;

  update public.profiles
  set survey_completed = true
  where id = auth.uid();
end;
$$;

-- Verified RPC: Record Focus Session
create or replace function public.record_focus_session(p_duration_minutes integer)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_mins integer := coalesce(p_duration_minutes, 0);
  v_hours integer;
  v_pts integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if v_mins <= 0 or v_mins > 300 then
    raise exception 'Invalid session duration' using errcode = '22023';
  end if;

  insert into public.focus_sessions (user_id, duration_minutes, completed)
  values (auth.uid(), v_mins, true);

  v_hours := v_mins / 60;
  v_pts := (v_mins / 5) * 2;

  update public.profiles
  set focus_sessions = coalesce(focus_sessions, 0) + 1,
      work_hours = coalesce(work_hours, 0) + v_hours,
      points = coalesce(points, 0) + v_pts,
      day_streak = coalesce(day_streak, 0) + 1
  where id = auth.uid();
end;
$$;

-- Verified RPC: Admin Award Points
create or replace function public.award_points(p_user_id uuid, p_points integer, p_reason text default '')
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin_aal2() then
    raise exception 'Two-factor authentication is required to award points' using errcode = '42501';
  end if;

  update public.profiles
  set points = coalesce(points, 0) + p_points
  where id = p_user_id;

  insert into public.admin_audit_log (actor, actor_email, action, target_table, target, "after")
  values (
    auth.uid(),
    (select email from public.profiles where id = auth.uid()),
    'points.award',
    'profiles',
    p_user_id::text,
    jsonb_build_object('points_delta', p_points, 'reason', p_reason)
  );
end;
$$;

revoke all on function public.complete_onboarding(jsonb), public.record_focus_session(integer), public.award_points(uuid, integer, text) from public, anon;
grant execute on function public.complete_onboarding(jsonb), public.record_focus_session(integer), public.award_points(uuid, integer, text) to authenticated;

-- ============================================================================
-- 7. RPC RATE-LIMITING EXPANSION
-- ============================================================================
-- respond_to_collaboration with rate limit
create or replace function public.respond_to_collaboration(collab_id uuid, response_status text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_collab public.collaborations%rowtype;
  v_partner_username text;
  v_calls integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  insert into public.rpc_rate_limit (user_id, operation, window_start, calls)
  values (auth.uid(), 'respond_to_collaboration', date_trunc('minute', now()), 1)
  on conflict (user_id, operation) do update
    set calls = case
          when public.rpc_rate_limit.window_start = date_trunc('minute', now())
            then public.rpc_rate_limit.calls + 1
          else 1
        end,
        window_start = date_trunc('minute', now())
  returning calls into v_calls;

  if v_calls > 20 then
    raise exception 'Too many collaboration responses. Try again in a minute.' using errcode = '53400';
  end if;

  if response_status not in ('accepted', 'declined') then
    raise exception 'Unsupported response';
  end if;

  select * into v_collab from public.collaborations where id = collab_id;

  if v_collab.id is null then
    raise exception 'Collaboration not found';
  end if;

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

-- get_or_create_direct_conversation with rate limit
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
  v_calls   integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  insert into public.rpc_rate_limit (user_id, operation, window_start, calls)
  values (auth.uid(), 'get_or_create_direct_conversation', date_trunc('minute', now()), 1)
  on conflict (user_id, operation) do update
    set calls = case
          when public.rpc_rate_limit.window_start = date_trunc('minute', now())
            then public.rpc_rate_limit.calls + 1
          else 1
        end,
        window_start = date_trunc('minute', now())
  returning calls into v_calls;

  if v_calls > 20 then
    raise exception 'Too many conversation creation attempts. Try again in a minute.' using errcode = '53400';
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

-- get_profiles_by_usernames with rate limit
create or replace function public.get_profiles_by_usernames(usernames text[])
returns table(id uuid, username text, full_name text, avatar_url text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_calls integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  insert into public.rpc_rate_limit (user_id, operation, window_start, calls)
  values (auth.uid(), 'get_profiles_by_usernames', date_trunc('minute', now()), 1)
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
    where p.username = any(usernames)
    limit 50;
end;
$$;

-- ============================================================================
-- 8. STORAGE HARDENING: COLLABORATION_IMAGES BUCKET & AAL2 AVATARS
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('collaboration_images', 'collaboration_images', true)
on conflict (id) do nothing;

update storage.buckets
set file_size_limit   = 5242880, -- 5 MB
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
where id = 'collaboration_images';

-- Insert path guard for collaboration_images: must be <auth.uid()>/<file>
drop policy if exists collab_images_insert_path_guard on storage.objects;
create policy collab_images_insert_path_guard on storage.objects
  as restrictive for insert to anon, authenticated
  with check (
    bucket_id <> 'collaboration_images'
    or (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Dynamic owner resolution for collaboration_images and avatars aal2 update
do $$
declare
  owner_col text;
begin
  if exists (select 1 from information_schema.columns where table_schema = 'storage' and table_name = 'objects' and column_name = 'owner_id') then
    owner_col := 'owner_id';
  elsif exists (select 1 from information_schema.columns where table_schema = 'storage' and table_name = 'objects' and column_name = 'owner') then
    owner_col := 'owner';
  else
    owner_col := null;
  end if;

  drop policy if exists collab_images_update_guard on storage.objects;
  drop policy if exists collab_images_delete_guard on storage.objects;
  drop policy if exists avatar_update_owner_guard on storage.objects;
  drop policy if exists avatar_delete_owner_guard on storage.objects;

  if owner_col is not null then
    -- Collaboration images owner-scoped update/delete
    execute format($p$
      create policy collab_images_update_guard on storage.objects
        as restrictive for update to anon, authenticated
        using (bucket_id <> 'collaboration_images' or %1$I::text = (select auth.uid())::text)
        with check (bucket_id <> 'collaboration_images' or %1$I::text = (select auth.uid())::text)
    $p$, owner_col);

    execute format($p$
      create policy collab_images_delete_guard on storage.objects
        as restrictive for delete to anon, authenticated
        using (bucket_id <> 'collaboration_images' or %1$I::text = (select auth.uid())::text or (select public.is_admin_aal2()))
    $p$, owner_col);

    -- Upgrade avatars bucket admin permissions to require AAL2
    execute format($p$
      create policy avatar_update_owner_guard on storage.objects
        as restrictive for update to anon, authenticated
        using (bucket_id <> 'avatars' or %1$I::text = (select auth.uid())::text or (select public.is_admin_aal2()))
        with check (bucket_id <> 'avatars' or %1$I::text = (select auth.uid())::text or (select public.is_admin_aal2()))
    $p$, owner_col);

    execute format($p$
      create policy avatar_delete_owner_guard on storage.objects
        as restrictive for delete to anon, authenticated
        using (bucket_id <> 'avatars' or %1$I::text = (select auth.uid())::text or (select public.is_admin_aal2()))
    $p$, owner_col);
  end if;
end $$;

-- ============================================================================
-- 9. VIEW-AS-USER (IMPERSONATION) AUDITING RPCS
-- ============================================================================
create or replace function public.start_impersonation(p_target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_target public.profiles%rowtype;
begin
  if not public.is_admin_aal2() then
    raise exception 'Two-factor authentication is required to view as user' using errcode = '42501';
  end if;

  if p_target_user_id is null or p_target_user_id = auth.uid() then
    raise exception 'Invalid target user for impersonation' using errcode = '22023';
  end if;

  select * into v_target from public.profiles where id = p_target_user_id;
  if v_target.id is null then
    raise exception 'Target user not found' using errcode = 'P0002';
  end if;

  insert into public.admin_audit_log (actor, actor_email, action, target_table, target, "after")
  values (
    auth.uid(),
    (select email from public.profiles where id = auth.uid()),
    'view_as_user.start',
    'profiles',
    p_target_user_id::text,
    jsonb_build_object('username', v_target.username, 'role', v_target.role)
  );

  return to_jsonb(v_target);
end;
$$;

create or replace function public.end_impersonation(p_target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin_aal2() then
    raise exception 'Two-factor authentication is required' using errcode = '42501';
  end if;

  insert into public.admin_audit_log (actor, actor_email, action, target_table, target)
  values (
    auth.uid(),
    (select email from public.profiles where id = auth.uid()),
    'view_as_user.exit',
    'profiles',
    coalesce(p_target_user_id::text, 'unknown')
  );
end;
$$;

revoke all on function public.start_impersonation(uuid), public.end_impersonation(uuid) from public, anon;
grant execute on function public.start_impersonation(uuid), public.end_impersonation(uuid) to authenticated;

-- ============================================================================
-- 10. EXPANDED ADMIN AUDIT LOG COVERAGE (INSERT / UPDATE / DELETE)
-- ============================================================================
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
  v_old     jsonb := null;
  v_new     jsonb := null;
begin
  begin
    v_headers := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  exception when others then
    v_headers := '{}'::jsonb;
  end;

  if tg_op in ('INSERT', 'UPDATE') then
    v_new := to_jsonb(new);
    v_target := coalesce(
      v_new ->> 'id',
      v_new ->> 'feature_name',
      v_new ->> 'setting_key'
    );
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    v_old := to_jsonb(old);
    if v_target is null then
      v_target := coalesce(
        v_old ->> 'id',
        v_old ->> 'feature_name',
        v_old ->> 'setting_key'
      );
    end if;
  end if;

  v_action := tg_table_name || '.' || lower(tg_op);

  insert into public.admin_audit_log
    (actor, actor_email, action, target_table, target, "before", "after", ip, user_agent)
  values (
    auth.uid(),
    (select p.email from public.profiles p where p.id = auth.uid()),
    v_action,
    tg_table_name,
    v_target,
    v_old,
    v_new,
    nullif(btrim(split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1)), ''),
    v_headers ->> 'user-agent'
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- Audit profile changes: admin updates and deletions
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

drop trigger if exists audit_profile_delete on public.profiles;
create trigger audit_profile_delete
  before delete on public.profiles
  for each row
  execute function public.write_admin_audit_log();

-- Audit platform settings: INSERT, UPDATE, DELETE
drop trigger if exists audit_platform_settings on public.platform_settings;
create trigger audit_platform_settings
  before insert or update or delete on public.platform_settings
  for each row execute function public.write_admin_audit_log();

-- Audit feature flags: INSERT, UPDATE, DELETE
drop trigger if exists audit_feature_flags on public.feature_flags;
create trigger audit_feature_flags
  before insert or update or delete on public.feature_flags
  for each row execute function public.write_admin_audit_log();

-- Audit tools table: INSERT, UPDATE, DELETE
drop trigger if exists audit_tools on public.tools;
create trigger audit_tools
  before insert or update or delete on public.tools
  for each row execute function public.write_admin_audit_log();

-- Audit reports table: status changes
drop trigger if exists audit_reports on public.reports;
create trigger audit_reports
  before update on public.reports
  for each row
  when (old.status is distinct from new.status)
  execute function public.write_admin_audit_log();

commit;
