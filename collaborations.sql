-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- COLLABORATIONS TABLE
-- ============================================================
-- Creates the table if it doesn't exist.
-- If the table already exists (from a previous migration), runs
-- ALTER statements to add new columns and drop old ones.
-- Idempotent: safe to run multiple times.
-- ============================================================

create table if not exists public.collaborations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,

  -- Brand Information
  brand_name text not null,
  brand_image text,
  website text,
  videos_count integer default 1,

  -- Social Links (dynamic array)
  social_links jsonb default '[]'::jsonb,

  -- Contact Information
  contact_name text,
  contact_email text,
  contact_phone text,

  -- Deal Information
  deal_type text not null check (deal_type in ('paid', 'creator', 'affiliate', 'services')),

  -- Paid Collaboration fields
  budget numeric(12, 2) default 0,
  paid_amount numeric(12, 2) default 0,
  remaining_amount numeric(12, 2) generated always as (budget - paid_amount) stored,
  payment_status text default 'unpaid' check (payment_status in ('unpaid', 'partial', 'paid')),

  -- Affiliate Partnership fields
  affiliate_link text,
  commission_percentage numeric(5, 2),
  expected_commission numeric(12, 2),
  affiliate_notes text,

  -- Services fields
  service_name text,
  service_description text,
  service_delivery_date date,
  service_status text,

  -- Creator Collaboration fields
  creator_name text,
  creator_platform text,
  creator_profile_link text,
  collaboration_goal text,
  shared_content_type text,

  -- Content Information
  platform text not null check (platform in ('instagram', 'tiktok', 'youtube', 'facebook', 'linkedin', 'x')),
  content_type text not null check (content_type in ('reel', 'story', 'post', 'carousel', 'video', 'short')),
  filming_date date,
  posting_date date,

  -- Status
  status text not null default 'new' check (status in ('new', 'negotiation', 'accepted', 'filming', 'editing', 'scheduled', 'posted', 'completed')),

  -- Ideas & Notes
  content_ideas text,
  inspiration_links text,
  notes text,

  -- Timeline (stores status changes as JSON array)
  timeline jsonb default '[]'::jsonb,

  -- Metadata
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================================
-- MIGRATE OLD TABLE (if table already existed from v1)
-- ============================================================

-- Add new columns (no-op if already present)
alter table public.collaborations
  add column if not exists videos_count integer default 1,
  add column if not exists social_links jsonb default '[]'::jsonb,
  add column if not exists affiliate_link text,
  add column if not exists commission_percentage numeric(5, 2),
  add column if not exists expected_commission numeric(12, 2),
  add column if not exists affiliate_notes text,
  add column if not exists service_name text,
  add column if not exists service_description text,
  add column if not exists service_delivery_date date,
  add column if not exists service_status text,
  add column if not exists creator_name text,
  add column if not exists creator_platform text,
  add column if not exists creator_profile_link text,
  add column if not exists collaboration_goal text,
  add column if not exists shared_content_type text;

-- Drop old fixed social columns (v1 schema)
alter table public.collaborations
  drop column if exists instagram_url,
  drop column if exists tiktok_url,
  drop column if exists youtube_url,
  drop column if exists facebook_url,
  drop column if exists linkedin_url,
  drop column if exists twitter_url;

-- Drop old contact_whatsapp (v1 schema)
alter table public.collaborations
  drop column if exists contact_whatsapp;

-- ============================================================
-- COMMENTS
-- ============================================================

comment on table public.collaborations is 'Brand collaborations and partnership management for content creators';
comment on column public.collaborations.videos_count is 'Number of videos/content pieces included in this collaboration';
comment on column public.collaborations.social_links is 'Dynamic array of social media links: [{platform, url}]';
comment on column public.collaborations.deal_type is 'Type of collaboration: paid, creator, affiliate, or services';
comment on column public.collaborations.payment_status is 'Payment status: unpaid, partial, or paid';
comment on column public.collaborations.status is 'Current workflow status of the collaboration';
comment on column public.collaborations.timeline is 'JSON array tracking status changes with dates';
comment on column public.collaborations.remaining_amount is 'Auto-calculated: budget - paid_amount';
comment on column public.collaborations.affiliate_link is 'Affiliate partnership tracking link';
comment on column public.collaborations.service_name is 'Name of the service being provided';
comment on column public.collaborations.creator_name is 'Name of the collaborating creator';

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_collaborations_user_id on public.collaborations(user_id);
create index if not exists idx_collaborations_status on public.collaborations(status);
create index if not exists idx_collaborations_deal_type on public.collaborations(deal_type);
create index if not exists idx_collaborations_platform on public.collaborations(platform);
create index if not exists idx_collaborations_posting_date on public.collaborations(posting_date);
create index if not exists idx_collaborations_filming_date on public.collaborations(filming_date);
create index if not exists idx_collaborations_created_at on public.collaborations(created_at desc);
create index if not exists idx_collaborations_budget on public.collaborations(budget);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on public.collaborations;
create trigger set_updated_at
  before update on public.collaborations
  for each row
  execute function public.handle_updated_at();

-- Timeline tracking trigger
-- Automatically appends status changes to the timeline array
create or replace function public.track_collaboration_timeline()
returns trigger as $$
begin
  if old is null or old.status <> new.status then
    new.timeline = coalesce(old.timeline, '[]'::jsonb) || jsonb_build_object(
      'status', new.status,
      'date', timezone('utc'::text, now())
    );
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists track_status_changes on public.collaborations;
create trigger track_status_changes
  before update on public.collaborations
  for each row
  when (old.status is distinct from new.status)
  execute function public.track_collaboration_timeline();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.collaborations enable row level security;

-- Drop old policies first (to avoid duplicates on re-run)
drop policy if exists "Users can view their own collaborations" on public.collaborations;
drop policy if exists "Users can insert their own collaborations" on public.collaborations;
drop policy if exists "Users can update their own collaborations" on public.collaborations;
drop policy if exists "Users can delete their own collaborations" on public.collaborations;

create policy "Users can view their own collaborations"
  on public.collaborations for select
  using (auth.uid() = user_id);

create policy "Users can insert their own collaborations"
  on public.collaborations for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own collaborations"
  on public.collaborations for update
  using (auth.uid() = user_id);

create policy "Users can delete their own collaborations"
  on public.collaborations for delete
  using (auth.uid() = user_id);
