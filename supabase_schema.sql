-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- CREATORS TABLE
create table public.creators (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  profile_url text,
  platform text check (platform in ('YouTube', 'Instagram', 'TikTok', 'X', 'Other')) not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- CONTENT IDEAS TABLE
create table public.content_ideas (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  status text check (status in ('Idea', 'Script', 'Filmed', 'Edited', 'Ready', 'Posted')) default 'Idea' not null,
  source_url text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ANALYTICS TABLE
create table public.analytics (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  video_title text not null,
  views integer default 0,
  likes integer default 0,
  comments integer default 0,
  date date default current_date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ROW LEVEL SECURITY (RLS)
-- Enable RLS on all tables
alter table public.creators enable row level security;
alter table public.content_ideas enable row level security;
alter table public.analytics enable row level security;

-- Policies for Creators
create policy "Users can view their own creators"
  on public.creators for select
  using (auth.uid() = user_id);

create policy "Users can insert their own creators"
  on public.creators for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own creators"
  on public.creators for update
  using (auth.uid() = user_id);

create policy "Users can delete their own creators"
  on public.creators for delete
  using (auth.uid() = user_id);

-- Policies for Content Ideas
create policy "Users can view their own ideas"
  on public.content_ideas for select
  using (auth.uid() = user_id);

create policy "Users can insert their own ideas"
  on public.content_ideas for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own ideas"
  on public.content_ideas for update
  using (auth.uid() = user_id);

create policy "Users can delete their own ideas"
  on public.content_ideas for delete
  using (auth.uid() = user_id);

-- Policies for Analytics
create policy "Users can view their own analytics"
  on public.analytics for select
  using (auth.uid() = user_id);

create policy "Users can insert their own analytics"
  on public.analytics for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own analytics"
  on public.analytics for update
  using (auth.uid() = user_id);

create policy "Users can delete their own analytics"
  on public.analytics for delete
  using (auth.uid() = user_id);
