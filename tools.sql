-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- TOOLS TABLE
-- ============================================================

create table if not exists public.tools (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  url text not null,
  description text,
  logo_url text,
  category text check (category in ('Video Editing', 'Development', 'Design', 'AI Tools', 'video ai', 'Open Source', 'Other')) not null default 'Other',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security (RLS)
alter table public.tools enable row level security;

-- Drop existing policies if they exist (to allow safe re-running)
drop policy if exists "Users can view their own tools" on public.tools;
drop policy if exists "Users can insert their own tools" on public.tools;
drop policy if exists "Users can update their own tools" on public.tools;
drop policy if exists "Users can delete their own tools" on public.tools;

-- Create policies
create policy "Users can view their own tools"
  on public.tools for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own tools"
  on public.tools for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own tools"
  on public.tools for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own tools"
  on public.tools for delete
  using ( auth.uid() = user_id );
