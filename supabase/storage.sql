-- =============================================================================
-- STORAGE — avatars bucket
-- =============================================================================
-- Run in the Supabase SQL editor (storage lives outside the public schema).
-- This file creates the bucket only. Size/MIME limits and the owner-scoped
-- policies are applied by supabase/migrations/006_avatars_bucket_hardening.sql,
-- which is the single source of truth for avatar access rules.
-- Uploads must be stored under `<auth.uid()>/<file>`.
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

update storage.buckets
set file_size_limit    = 3145728,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
where id = 'avatars';

-- Then run supabase/migrations/006_avatars_bucket_hardening.sql
