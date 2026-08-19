-- =============================================================================
-- STORAGE BUCKETS & POLICIES
-- =============================================================================
-- Run this in the Supabase SQL Editor (NOT raw SQL — storage requires dashboard)
-- =============================================================================

-- ── Avatars Bucket ───────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload avatars
drop policy if exists "Users can upload avatars" on storage.objects;
create policy "Users can upload avatars" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and auth.role() = 'authenticated'
  );

-- Allow public read access (avatars are public images)
drop policy if exists "Public can view avatars" on storage.objects;
create policy "Public can view avatars" on storage.objects
  for select using (bucket_id = 'avatars');

-- Allow users to delete their own uploaded avatars
drop policy if exists "Users can delete their own avatars" on storage.objects;
create policy "Users can delete their own avatars" on storage.objects
  for delete using (
    bucket_id = 'avatars' and auth.uid() = owner
  );
