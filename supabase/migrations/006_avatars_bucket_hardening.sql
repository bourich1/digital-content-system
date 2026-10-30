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
