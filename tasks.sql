-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- TASKS TABLE
-- ============================================================

create table if not exists public.tasks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  is_completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security (RLS)
alter table public.tasks enable row level security;

-- Drop existing policies if they exist (to allow safe re-running)
drop policy if exists "Users can view their own tasks" on public.tasks;
drop policy if exists "Users can insert their own tasks" on public.tasks;
drop policy if exists "Users can update their own tasks" on public.tasks;
drop policy if exists "Users can delete their own tasks" on public.tasks;

-- Create policies
create policy "Users can view their own tasks"
  on public.tasks for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own tasks"
  on public.tasks for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own tasks"
  on public.tasks for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own tasks"
  on public.tasks for delete
  using ( auth.uid() = user_id );

-- ============================================================
-- AUTO-DELETE TASKS EVERY 24 HOURS (CRON JOB)
-- ============================================================

-- Note: To run this in Supabase, you must enable the pg_cron extension.
create extension if not exists pg_cron;

-- Schedule a job to delete all tasks every day at midnight (UTC)
-- The cron expression '0 0 * * *' means every day at 00:00.
select cron.schedule(
  'delete-all-tasks-daily',
  '0 0 * * *',
  $$ delete from public.tasks $$
);
