-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- CONTENT IDEAS TABLE
-- ============================================================

create table if not exists public.content_ideas (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  status text check (status in ('Idea', 'Script', 'Filmed', 'Edited', 'Ready', 'Posted')) not null default 'Idea',
  source_url text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security (RLS)
alter table public.content_ideas enable row level security;

-- Drop existing policies if they exist (to allow safe re-running)
drop policy if exists "Users can view their own content ideas" on public.content_ideas;
drop policy if exists "Users can insert their own content ideas" on public.content_ideas;
drop policy if exists "Users can update their own content ideas" on public.content_ideas;
drop policy if exists "Users can delete their own content ideas" on public.content_ideas;

-- Create policies
create policy "Users can view their own content ideas"
  on public.content_ideas for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own content ideas"
  on public.content_ideas for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own content ideas"
  on public.content_ideas for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own content ideas"
  on public.content_ideas for delete
  using ( auth.uid() = user_id );
