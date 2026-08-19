-- =============================================================================
-- DIGITAL CONTENT SYSTEM — ALL ADMIN QUERIES
-- This file combines admin_update.sql, admin_support.sql, admin_chat.sql, 
-- and fix_blocked_features.sql into a single execution script.
-- Run this in the Supabase SQL Editor
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. FEATURE FLAGS & BLOCKED FEATURES
-- -----------------------------------------------------------------------------

create table if not exists public.feature_flags (
  feature_name text primary key,
  enabled boolean default true,
  description text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table if exists public.feature_flags enable row level security;

drop policy if exists "Feature flags are viewable by everyone" on public.feature_flags;
create policy "Feature flags are viewable by everyone" on public.feature_flags
  for select using (true);

drop policy if exists "Feature flags are updateable by admin only" on public.feature_flags;
create policy "Feature flags are updateable by admin only" on public.feature_flags
  for all using (public.is_admin());

insert into public.feature_flags (feature_name, enabled, description) values
('ideas', true, 'Content Ideas module'),
('calendar', true, 'Calendar module'),
('focus_room', true, 'Focus Room module'),
('ai_assistant', true, 'AI Assistant module'),
('collaboration', true, 'Collaboration module'),
('tasks', true, 'Tasks module'),
('notifications', true, 'Notifications module'),
('survey', true, 'Survey module'),
('onboarding', true, 'Onboarding module')
on conflict (feature_name) do nothing;

-- Add blocked_features to profiles (from fix_blocked_features.sql and admin_update.sql)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blocked_features text[] DEFAULT '{}'::text[];

-- -----------------------------------------------------------------------------
-- 2. DASHBOARD REPORTS & TABLES
-- -----------------------------------------------------------------------------

create table if not exists public.reports (
  id uuid default gen_random_uuid() primary key,
  reporter_id uuid references public.profiles(id) on delete cascade not null,
  reported_content_id text not null,
  content_type text check (content_type in ('idea', 'task', 'collaboration', 'comment')) not null,
  reason text not null,
  description text,
  status text check (status in ('pending', 'reviewed', 'rejected')) default 'pending' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamp with time zone
);

alter table if exists public.reports enable row level security;

drop policy if exists "Users can insert reports" on public.reports;
create policy "Users can insert reports" on public.reports
  for insert with check (auth.uid() = reporter_id);

drop policy if exists "Users can view their own reports" on public.reports;
create policy "Users can view their own reports" on public.reports
  for select using (auth.uid() = reporter_id);

drop policy if exists "Admins can do everything on reports" on public.reports;
create policy "Admins can do everything on reports" on public.reports
  for all using (public.is_admin());

-- Add analytics fields to onboarding_surveys
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='onboarding_surveys' and column_name='country') then
    alter table public.onboarding_surveys add column country text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='onboarding_surveys' and column_name='language') then
    alter table public.onboarding_surveys add column language text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='onboarding_surveys' and column_name='profession') then
    alter table public.onboarding_surveys add column profession text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='onboarding_surveys' and column_name='experience_level') then
    alter table public.onboarding_surveys add column experience_level text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='onboarding_surveys' and column_name='satisfaction') then
    alter table public.onboarding_surveys add column satisfaction integer;
  end if;
end $$;

-- Dashboard counts tables
create table if not exists public.calendar_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table if exists public.calendar_events enable row level security;
drop policy if exists "Users can manage their calendar_events" on public.calendar_events;
create policy "Users can manage their calendar_events" on public.calendar_events
  for all using (auth.uid() = user_id or is_admin());

create table if not exists public.focus_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  duration_minutes integer not null,
  completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table if exists public.focus_sessions enable row level security;
drop policy if exists "Users can manage their focus_sessions" on public.focus_sessions;
create policy "Users can manage their focus_sessions" on public.focus_sessions
  for all using (auth.uid() = user_id or is_admin());


-- -----------------------------------------------------------------------------
-- 3. SUPPORT TICKETS (LEGACY) & NOTIFICATIONS
-- -----------------------------------------------------------------------------

create table if not exists public.support_tickets (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    feature_name text not null,
    message text not null,
    admin_reply text,
    status text check (status in ('open', 'replied', 'closed')) default 'open',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.in_app_notifications (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    title text not null,
    message text not null,
    is_read boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.support_tickets enable row level security;

drop policy if exists "Users can insert their own support tickets" on public.support_tickets;
create policy "Users can insert their own support tickets"
    on public.support_tickets for insert
    with check (auth.uid() = user_id);

drop policy if exists "Users can view their own support tickets" on public.support_tickets;
create policy "Users can view their own support tickets"
    on public.support_tickets for select
    using (auth.uid() = user_id);

drop policy if exists "Admins can view all support tickets" on public.support_tickets;
create policy "Admins can view all support tickets"
    on public.support_tickets for select
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
        )
    );

drop policy if exists "Admins can update support tickets" on public.support_tickets;
create policy "Admins can update support tickets"
    on public.support_tickets for update
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
        )
    );

alter table public.in_app_notifications enable row level security;

drop policy if exists "Users can view their own notifications" on public.in_app_notifications;
create policy "Users can view their own notifications"
    on public.in_app_notifications for select
    using (auth.uid() = user_id);

drop policy if exists "Users can update their own notifications (mark as read)" on public.in_app_notifications;
create policy "Users can update their own notifications (mark as read)"
    on public.in_app_notifications for update
    using (auth.uid() = user_id);

drop policy if exists "Admins can insert notifications" on public.in_app_notifications;
create policy "Admins can insert notifications"
    on public.in_app_notifications for insert
    with check (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
        )
    );

create or replace function public.handle_ticket_reply()
returns trigger as $$
begin
    if new.admin_reply is not null and old.admin_reply is null then
        insert into public.in_app_notifications (user_id, title, message)
        values (
            new.user_id,
            'Support Reply',
            'An admin has replied to your ticket regarding ' || new.feature_name || '.'
        );
    end if;
    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_ticket_reply on public.support_tickets;
create trigger on_ticket_reply
    after update on public.support_tickets
    for each row execute procedure public.handle_ticket_reply();


-- -----------------------------------------------------------------------------
-- 4. LIVE SUPPORT CHAT
-- -----------------------------------------------------------------------------

create table if not exists public.support_messages (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    sender_id uuid references public.profiles(id) on delete cascade not null,
    content text not null,
    is_read boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.support_messages enable row level security;

drop policy if exists "Users can insert their own messages" on public.support_messages;
create policy "Users can insert their own messages"
    on public.support_messages for insert
    with check (auth.uid() = sender_id and auth.uid() = user_id);

drop policy if exists "Users can view their own chat" on public.support_messages;
create policy "Users can view their own chat"
    on public.support_messages for select
    using (auth.uid() = user_id);

drop policy if exists "Admins can view all messages" on public.support_messages;
create policy "Admins can view all messages"
    on public.support_messages for select
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
        )
    );

drop policy if exists "Admins can reply to any chat" on public.support_messages;
create policy "Admins can reply to any chat"
    on public.support_messages for insert
    with check (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
        )
        and auth.uid() = sender_id
    );

drop policy if exists "Admins can mark messages as read" on public.support_messages;
create policy "Admins can mark messages as read"
    on public.support_messages for update
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
        )
    );

drop policy if exists "Users can mark messages as read" on public.support_messages;
create policy "Users can mark messages as read"
    on public.support_messages for update
    using (auth.uid() = user_id);

-- Trigger to notify user when admin sends a message
create or replace function notify_user_on_admin_message()
returns trigger as $$
begin
    if NEW.sender_id != NEW.user_id then
        insert into public.in_app_notifications (user_id, title, message)
        values (
            NEW.user_id,
            'New Support Reply',
            substring(NEW.content from 1 for 100) || case when length(NEW.content) > 100 then '...' else '' end
        );
    end if;
    return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists on_admin_message on public.support_messages;
create trigger on_admin_message
    after insert on public.support_messages
    for each row execute function notify_user_on_admin_message();


-- -----------------------------------------------------------------------------
-- 5. REALTIME & CACHE RELOAD
-- -----------------------------------------------------------------------------

-- Add Realtime support
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'in_app_notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.in_app_notifications;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'support_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
  END IF;
END $$;

-- Reload schema cache to apply changes immediately
NOTIFY pgrst, 'reload schema';
