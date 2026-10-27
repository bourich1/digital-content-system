-- =============================================================================
-- DIGITAL CONTENT SYSTEM — COMPLETE DATABASE SCHEMA
-- =============================================================================
-- All statements are idempotent (IF NOT EXISTS / OR REPLACE / ON CONFLICT).
-- Safe to run multiple times.
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
returns boolean as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

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
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "Admins can do everything on profiles" on public.profiles;
create policy "Admins can do everything on profiles" on public.profiles
  for all using (public.is_admin());

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
-- Replace 'your-email@example.com' with your actual email:
-- update public.profiles set role = 'admin' where email = 'Admin@Bourich.com';
