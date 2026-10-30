-- 008 — Comprehensive Security Hardening
-- Implements:
-- 1. Complete MFA database enforcement: is_admin_aal2() across tasks, collaborations,
--    calendar_events, focus_sessions, reports, support_tickets, support_messages,
--    legacy commerce tables, and storage buckets.
-- 2. Collaboration authorization & IDOR elimination: granular SELECT/INSERT/UPDATE/DELETE.
-- 3. Support message sender integrity: sender_id = auth.uid(), aal2 required for admin replies.
-- 4. Business logic protection: points, streaks, hours, focus sessions, and survey_completed
--    shielded from direct client writes; verified RPCs for onboarding and focus sessions.
-- 5. RPC rate-limiting on get_or_create_direct_conversation, respond_to_collaboration,
--    get_profiles_by_usernames.
-- 6. Storage hardening for collaboration_images bucket (5MB limit, image MIME types, auth.uid path).
-- 7. View-as-user (impersonation) auditing RPCs (start_impersonation, end_impersonation).
-- 8. Expanded admin_audit_log coverage (INSERT/UPDATE/DELETE across sensitive tables).
-- 9. verify_admin_access() RPC for secure admin login authentication.

begin;

-- ============================================================================
-- 1. SERVER-SIDE ADMIN VERIFICATION
-- ============================================================================
create or replace function public.verify_admin_access()
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.verify_admin_access() from public, anon;
grant execute on function public.verify_admin_access() to authenticated;

-- ============================================================================
-- 2. SENSITIVE USER TABLES: AAL2 ENFORCEMENT ON ADMIN ACCESS
-- ============================================================================
-- Tasks
drop policy if exists "Users can manage their own tasks" on public.tasks;
create policy "Users can manage their own tasks" on public.tasks
  for all using (auth.uid() = user_id or (select public.is_admin_aal2()));

-- Calendar events
drop policy if exists "Users can manage their calendar_events" on public.calendar_events;
create policy "Users can manage their calendar_events" on public.calendar_events
  for all using (auth.uid() = user_id or (select public.is_admin_aal2()));

-- Focus sessions
drop policy if exists "Users can manage their focus_sessions" on public.focus_sessions;
create policy "Users can manage their focus_sessions" on public.focus_sessions
  for all using (auth.uid() = user_id or (select public.is_admin_aal2()));

-- Content ideas
drop policy if exists "Admins can do everything on ideas" on public.content_ideas;
create policy "Admins can do everything on ideas" on public.content_ideas
  for all using ((select public.is_admin_aal2()));

-- ============================================================================
-- 3. COLLABORATIONS: GRANULAR IDOR PROTECTION & SENDER INTEGRITY
-- ============================================================================
drop policy if exists "Users can manage their own collaborations" on public.collaborations;
drop policy if exists "collaborations_select" on public.collaborations;
drop policy if exists "collaborations_insert" on public.collaborations;
drop policy if exists "collaborations_update" on public.collaborations;
drop policy if exists "collaborations_delete" on public.collaborations;

-- SELECT: owner OR invited partner OR aal2 admin
create policy "collaborations_select" on public.collaborations
  for select using (
    auth.uid() = user_id
    or auth.uid() = partner_id
    or (select public.is_admin_aal2())
  );

-- INSERT: only the owner may create a collaboration
create policy "collaborations_insert" on public.collaborations
  for insert with check (
    auth.uid() = user_id
  );

-- UPDATE: owner only (partner response changes happen strictly via respond_to_collaboration)
create policy "collaborations_update" on public.collaborations
  for update using (
    auth.uid() = user_id
  ) with check (
    auth.uid() = user_id
  );

-- DELETE: owner or aal2 admin
create policy "collaborations_delete" on public.collaborations
  for delete using (
    auth.uid() = user_id
    or (select public.is_admin_aal2())
  );

-- Collaboration Images Table
drop policy if exists "Users can manage their own collaboration images" on public.collaboration_images;
drop policy if exists "collaboration_images_select" on public.collaboration_images;
drop policy if exists "collaboration_images_insert" on public.collaboration_images;
drop policy if exists "collaboration_images_update" on public.collaboration_images;
drop policy if exists "collaboration_images_delete" on public.collaboration_images;

create policy "collaboration_images_select" on public.collaboration_images
  for select using (
    exists (
      select 1 from public.collaborations c
      where c.id = collaboration_id
        and (c.user_id = auth.uid() or c.partner_id = auth.uid() or (select public.is_admin_aal2()))
    )
  );

create policy "collaboration_images_insert" on public.collaboration_images
  for insert with check (
    exists (
      select 1 from public.collaborations c
      where c.id = collaboration_id
        and c.user_id = auth.uid()
    )
  );

create policy "collaboration_images_update" on public.collaboration_images
  for update using (
    exists (
      select 1 from public.collaborations c
      where c.id = collaboration_id
        and c.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.collaborations c
      where c.id = collaboration_id
        and c.user_id = auth.uid()
    )
  );

create policy "collaboration_images_delete" on public.collaboration_images
  for delete using (
    exists (
      select 1 from public.collaborations c
      where c.id = collaboration_id
        and (c.user_id = auth.uid() or (select public.is_admin_aal2()))
    )
  );

-- ============================================================================
-- 4. SUPPORT MESSAGES & TICKETS: SENDER FORGERY PROTECTION & AAL2
-- ============================================================================
drop policy if exists "Users can insert their own messages" on public.support_messages;
create policy "Users can insert their own messages" on public.support_messages
  for insert with check (auth.uid() = sender_id and auth.uid() = user_id);

drop policy if exists "Admins can view all messages" on public.support_messages;
create policy "Admins can view all messages" on public.support_messages
  for select using ((select public.is_admin_aal2()));

drop policy if exists "Admins can reply to any chat" on public.support_messages;
create policy "Admins can reply to any chat" on public.support_messages
  for insert with check ((select public.is_admin_aal2()) and auth.uid() = sender_id);

drop policy if exists "Admins can mark messages as read" on public.support_messages;
create policy "Admins can mark messages as read" on public.support_messages
  for update using ((select public.is_admin_aal2()));

-- Support tickets
drop policy if exists "Admins can view all support tickets" on public.support_tickets;
create policy "Admins can view all support tickets" on public.support_tickets
  for select using ((select public.is_admin_aal2()));

drop policy if exists "Admins can update support tickets" on public.support_tickets;
create policy "Admins can update support tickets" on public.support_tickets
  for update using ((select public.is_admin_aal2()))
  with check ((select public.is_admin_aal2()));

-- Reports
drop policy if exists "Admins can do everything on reports" on public.reports;
create policy "Admins can do everything on reports" on public.reports
  for all using ((select public.is_admin_aal2()))
  with check ((select public.is_admin_aal2()));

-- ============================================================================
-- 5. LEGACY COMMERCE TABLES: REQUIRE AAL2 FOR ADMINISTRATORS
-- ============================================================================
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'categories', 'products', 'product_images', 'product_variants',
    'ads', 'coupons', 'orders', 'order_items', 'content_items'
  ] loop
    if exists (select 1 from pg_tables where schemaname = 'public' and tablename = tbl) then
      execute format('drop policy if exists %I on public.%I', 'legacy_admin_only_' || tbl, tbl);
      execute format(
        'create policy %I on public.%I for all to authenticated using ((select public.is_admin_aal2())) with check ((select public.is_admin_aal2()))',
        'legacy_admin_only_' || tbl, tbl
      );
    end if;
  end loop;
end $$;

-- ============================================================================
-- 6. BUSINESS LOGIC FIELD PROTECTION & VERIFIED PROFILES TRIGGER
-- ============================================================================
create or replace function public.guard_profile_security_fields()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if new.id                 is distinct from old.id
    or new.role               is distinct from old.role
    or new.status             is distinct from old.status
    or new.can_access_tools   is distinct from old.can_access_tools
    or new.blocked_features   is distinct from old.blocked_features
    or new.email              is distinct from old.email
    or new.created_at         is distinct from old.created_at
    or new.points             is distinct from old.points
    or new.day_streak         is distinct from old.day_streak
    or new.work_hours         is distinct from old.work_hours
    or new.focus_sessions     is distinct from old.focus_sessions
    or new.survey_completed   is distinct from old.survey_completed then
      if not public.is_admin() then
        raise exception 'Only administrators can change protected profile fields'
          using errcode = '42501';
      end if;
      if not public.is_admin_aal2() then
        raise exception 'Two-factor authentication is required to change protected profile fields'
          using errcode = '42501';
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- Verified RPC: Complete Onboarding Survey
create or replace function public.complete_onboarding(p_survey jsonb default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if p_survey is not null and p_survey <> '{}'::jsonb then
    insert into public.onboarding_surveys (
      user_id, source, goals, experience_level, primary_platform,
      country, language, profession, satisfaction
    ) values (
      auth.uid(),
      p_survey ->> 'source',
      case when jsonb_typeof(p_survey -> 'goals') = 'array' then
        array(select jsonb_array_elements_text(p_survey -> 'goals'))
      else '{}'::text[] end,
      p_survey ->> 'experience_level',
      p_survey ->> 'primary_platform',
      p_survey ->> 'country',
      p_survey ->> 'language',
      p_survey ->> 'profession',
      nullif(p_survey ->> 'satisfaction', '')::integer
    );
  end if;

  update public.profiles
  set survey_completed = true
  where id = auth.uid();
end;
$$;

-- Verified RPC: Record Focus Session
create or replace function public.record_focus_session(p_duration_minutes integer)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_mins integer := coalesce(p_duration_minutes, 0);
  v_hours integer;
  v_pts integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if v_mins <= 0 or v_mins > 300 then
    raise exception 'Invalid session duration' using errcode = '22023';
  end if;

  insert into public.focus_sessions (user_id, duration_minutes, completed)
  values (auth.uid(), v_mins, true);

  v_hours := v_mins / 60;
  v_pts := (v_mins / 5) * 2;

  update public.profiles
  set focus_sessions = coalesce(focus_sessions, 0) + 1,
      work_hours = coalesce(work_hours, 0) + v_hours,
      points = coalesce(points, 0) + v_pts,
      day_streak = coalesce(day_streak, 0) + 1
  where id = auth.uid();
end;
$$;

-- Verified RPC: Admin Award Points
create or replace function public.award_points(p_user_id uuid, p_points integer, p_reason text default '')
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin_aal2() then
    raise exception 'Two-factor authentication is required to award points' using errcode = '42501';
  end if;

  update public.profiles
  set points = coalesce(points, 0) + p_points
  where id = p_user_id;

  insert into public.admin_audit_log (actor, actor_email, action, target_table, target, "after")
  values (
    auth.uid(),
    (select email from public.profiles where id = auth.uid()),
    'points.award',
    'profiles',
    p_user_id::text,
    jsonb_build_object('points_delta', p_points, 'reason', p_reason)
  );
end;
$$;

revoke all on function public.complete_onboarding(jsonb), public.record_focus_session(integer), public.award_points(uuid, integer, text) from public, anon;
grant execute on function public.complete_onboarding(jsonb), public.record_focus_session(integer), public.award_points(uuid, integer, text) to authenticated;

-- ============================================================================
-- 7. RPC RATE-LIMITING EXPANSION
-- ============================================================================
-- respond_to_collaboration with rate limit
create or replace function public.respond_to_collaboration(collab_id uuid, response_status text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_collab public.collaborations%rowtype;
  v_partner_username text;
  v_calls integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  insert into public.rpc_rate_limit (user_id, operation, window_start, calls)
  values (auth.uid(), 'respond_to_collaboration', date_trunc('minute', now()), 1)
  on conflict (user_id, operation) do update
    set calls = case
          when public.rpc_rate_limit.window_start = date_trunc('minute', now())
            then public.rpc_rate_limit.calls + 1
          else 1
        end,
        window_start = date_trunc('minute', now())
  returning calls into v_calls;

  if v_calls > 20 then
    raise exception 'Too many collaboration responses. Try again in a minute.' using errcode = '53400';
  end if;

  if response_status not in ('accepted', 'declined') then
    raise exception 'Unsupported response';
  end if;

  select * into v_collab from public.collaborations where id = collab_id;

  if v_collab.id is null then
    raise exception 'Collaboration not found';
  end if;

  if v_collab.partner_id is null or v_collab.partner_id is distinct from auth.uid() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select username into v_partner_username from public.profiles where id = v_collab.partner_id;

  if response_status = 'accepted' then
    update public.collaborations set partner_status = 'accepted' where id = collab_id;

    insert into public.in_app_notifications (user_id, collab_id, title, message)
    values (
      v_collab.user_id,
      v_collab.id,
      'Collaboration Accepted',
      '@' || coalesce(v_partner_username, 'Someone') || ' accepted your collaboration request!'
    );
  else
    delete from public.collaborations where id = collab_id;

    insert into public.in_app_notifications (user_id, collab_id, title, message)
    values (
      v_collab.user_id,
      v_collab.id,
      'Collaboration Declined',
      '@' || coalesce(v_partner_username, 'Someone') || ' declined your collaboration request.'
    );
  end if;
end;
$$;

-- get_or_create_direct_conversation with rate limit
create or replace function public.get_or_create_direct_conversation(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user1   uuid;
  v_user2   uuid;
  v_hash    text;
  v_conv_id uuid;
  v_calls   integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  insert into public.rpc_rate_limit (user_id, operation, window_start, calls)
  values (auth.uid(), 'get_or_create_direct_conversation', date_trunc('minute', now()), 1)
  on conflict (user_id, operation) do update
    set calls = case
          when public.rpc_rate_limit.window_start = date_trunc('minute', now())
            then public.rpc_rate_limit.calls + 1
          else 1
        end,
        window_start = date_trunc('minute', now())
  returning calls into v_calls;

  if v_calls > 20 then
    raise exception 'Too many conversation creation attempts. Try again in a minute.' using errcode = '53400';
  end if;

  if target_user_id is null then
    raise exception 'Target user is required';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'Cannot create a direct conversation with yourself';
  end if;

  if not exists (select 1 from public.profiles where id = target_user_id) then
    raise exception 'Target account not found';
  end if;

  if auth.uid() < target_user_id then
    v_user1 := auth.uid();
    v_user2 := target_user_id;
  else
    v_user1 := target_user_id;
    v_user2 := auth.uid();
  end if;

  v_hash := v_user1::text || ':' || v_user2::text;

  select id into v_conv_id from public.conversations where participant_hash = v_hash;

  if v_conv_id is null then
    select cp1.conversation_id into v_conv_id
    from public.conversation_participants cp1
    join public.conversation_participants cp2 on cp1.conversation_id = cp2.conversation_id
    where cp1.user_id = v_user1 and cp2.user_id = v_user2;
  end if;

  if v_conv_id is not null then
    update public.conversations set participant_hash = v_hash
    where id = v_conv_id and participant_hash is null;
    return v_conv_id;
  end if;

  insert into public.conversations (participant_hash) values (v_hash)
  on conflict (participant_hash) do nothing;

  select id into v_conv_id from public.conversations where participant_hash = v_hash;

  if v_conv_id is null then
    raise exception 'Failed to create conversation';
  end if;

  insert into public.conversation_participants (conversation_id, user_id)
  values (v_conv_id, v_user1), (v_conv_id, v_user2)
  on conflict (conversation_id, user_id) do nothing;

  return v_conv_id;
end;
$$;

-- get_profiles_by_usernames with rate limit
create or replace function public.get_profiles_by_usernames(usernames text[])
returns table(id uuid, username text, full_name text, avatar_url text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_calls integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  insert into public.rpc_rate_limit (user_id, operation, window_start, calls)
  values (auth.uid(), 'get_profiles_by_usernames', date_trunc('minute', now()), 1)
  on conflict (user_id, operation) do update
    set calls = case
          when public.rpc_rate_limit.window_start = date_trunc('minute', now())
            then public.rpc_rate_limit.calls + 1
          else 1
        end,
        window_start = date_trunc('minute', now())
  returning calls into v_calls;

  if v_calls > 30 then
    raise exception 'Too many lookups. Try again in a minute.' using errcode = '53400';
  end if;

  return query
    select p.id, p.username, p.full_name, p.avatar_url
    from public.profiles p
    where p.username = any(usernames)
    limit 50;
end;
$$;

-- ============================================================================
-- 8. STORAGE HARDENING: COLLABORATION_IMAGES BUCKET & AAL2 AVATARS
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('collaboration_images', 'collaboration_images', true)
on conflict (id) do nothing;

update storage.buckets
set file_size_limit   = 5242880, -- 5 MB
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
where id = 'collaboration_images';

-- Insert path guard for collaboration_images: must be <auth.uid()>/<file>
drop policy if exists collab_images_insert_path_guard on storage.objects;
create policy collab_images_insert_path_guard on storage.objects
  as restrictive for insert to anon, authenticated
  with check (
    bucket_id <> 'collaboration_images'
    or (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Dynamic owner resolution for collaboration_images and avatars aal2 update
do $$
declare
  owner_col text;
begin
  if exists (select 1 from information_schema.columns where table_schema = 'storage' and table_name = 'objects' and column_name = 'owner_id') then
    owner_col := 'owner_id';
  elsif exists (select 1 from information_schema.columns where table_schema = 'storage' and table_name = 'objects' and column_name = 'owner') then
    owner_col := 'owner';
  else
    owner_col := null;
  end if;

  drop policy if exists collab_images_update_guard on storage.objects;
  drop policy if exists collab_images_delete_guard on storage.objects;
  drop policy if exists avatar_update_owner_guard on storage.objects;
  drop policy if exists avatar_delete_owner_guard on storage.objects;

  if owner_col is not null then
    -- Collaboration images owner-scoped update/delete
    execute format($p$
      create policy collab_images_update_guard on storage.objects
        as restrictive for update to anon, authenticated
        using (bucket_id <> 'collaboration_images' or %1$I::text = (select auth.uid())::text)
        with check (bucket_id <> 'collaboration_images' or %1$I::text = (select auth.uid())::text)
    $p$, owner_col);

    execute format($p$
      create policy collab_images_delete_guard on storage.objects
        as restrictive for delete to anon, authenticated
        using (bucket_id <> 'collaboration_images' or %1$I::text = (select auth.uid())::text or (select public.is_admin_aal2()))
    $p$, owner_col);

    -- Upgrade avatars bucket admin permissions to require AAL2
    execute format($p$
      create policy avatar_update_owner_guard on storage.objects
        as restrictive for update to anon, authenticated
        using (bucket_id <> 'avatars' or %1$I::text = (select auth.uid())::text or (select public.is_admin_aal2()))
        with check (bucket_id <> 'avatars' or %1$I::text = (select auth.uid())::text or (select public.is_admin_aal2()))
    $p$, owner_col);

    execute format($p$
      create policy avatar_delete_owner_guard on storage.objects
        as restrictive for delete to anon, authenticated
        using (bucket_id <> 'avatars' or %1$I::text = (select auth.uid())::text or (select public.is_admin_aal2()))
    $p$, owner_col);
  end if;
end $$;

-- ============================================================================
-- 9. VIEW-AS-USER (IMPERSONATION) AUDITING RPCS
-- ============================================================================
create or replace function public.start_impersonation(p_target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_target public.profiles%rowtype;
begin
  if not public.is_admin_aal2() then
    raise exception 'Two-factor authentication is required to view as user' using errcode = '42501';
  end if;

  if p_target_user_id is null or p_target_user_id = auth.uid() then
    raise exception 'Invalid target user for impersonation' using errcode = '22023';
  end if;

  select * into v_target from public.profiles where id = p_target_user_id;
  if v_target.id is null then
    raise exception 'Target user not found' using errcode = 'P0002';
  end if;

  insert into public.admin_audit_log (actor, actor_email, action, target_table, target, "after")
  values (
    auth.uid(),
    (select email from public.profiles where id = auth.uid()),
    'view_as_user.start',
    'profiles',
    p_target_user_id::text,
    jsonb_build_object('username', v_target.username, 'role', v_target.role)
  );

  return to_jsonb(v_target);
end;
$$;

create or replace function public.end_impersonation(p_target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin_aal2() then
    raise exception 'Two-factor authentication is required' using errcode = '42501';
  end if;

  insert into public.admin_audit_log (actor, actor_email, action, target_table, target)
  values (
    auth.uid(),
    (select email from public.profiles where id = auth.uid()),
    'view_as_user.exit',
    'profiles',
    coalesce(p_target_user_id::text, 'unknown')
  );
end;
$$;

revoke all on function public.start_impersonation(uuid), public.end_impersonation(uuid) from public, anon;
grant execute on function public.start_impersonation(uuid), public.end_impersonation(uuid) to authenticated;

-- ============================================================================
-- 10. EXPANDED ADMIN AUDIT LOG COVERAGE (INSERT / UPDATE / DELETE)
-- ============================================================================
create or replace function public.write_admin_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_headers jsonb := '{}'::jsonb;
  v_target  text;
  v_action  text;
  v_old     jsonb := null;
  v_new     jsonb := null;
begin
  begin
    v_headers := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  exception when others then
    v_headers := '{}'::jsonb;
  end;

  if tg_op in ('INSERT', 'UPDATE') then
    v_new := to_jsonb(new);
    v_target := coalesce(
      v_new ->> 'id',
      v_new ->> 'feature_name',
      v_new ->> 'setting_key'
    );
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    v_old := to_jsonb(old);
    if v_target is null then
      v_target := coalesce(
        v_old ->> 'id',
        v_old ->> 'feature_name',
        v_old ->> 'setting_key'
      );
    end if;
  end if;

  v_action := tg_table_name || '.' || lower(tg_op);

  insert into public.admin_audit_log
    (actor, actor_email, action, target_table, target, "before", "after", ip, user_agent)
  values (
    auth.uid(),
    (select p.email from public.profiles p where p.id = auth.uid()),
    v_action,
    tg_table_name,
    v_target,
    v_old,
    v_new,
    nullif(btrim(split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1)), ''),
    v_headers ->> 'user-agent'
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- Audit profile changes: admin updates and deletions
drop trigger if exists audit_profile_privileged_changes on public.profiles;
create trigger audit_profile_privileged_changes
  before update on public.profiles
  for each row
  when (
    old.role             is distinct from new.role
    or old.status        is distinct from new.status
    or old.can_access_tools is distinct from new.can_access_tools
    or old.blocked_features is distinct from new.blocked_features
    or old.email         is distinct from new.email
  )
  execute function public.write_admin_audit_log();

drop trigger if exists audit_profile_delete on public.profiles;
create trigger audit_profile_delete
  before delete on public.profiles
  for each row
  execute function public.write_admin_audit_log();

-- Audit platform settings: INSERT, UPDATE, DELETE
drop trigger if exists audit_platform_settings on public.platform_settings;
create trigger audit_platform_settings
  before insert or update or delete on public.platform_settings
  for each row execute function public.write_admin_audit_log();

-- Audit feature flags: INSERT, UPDATE, DELETE
drop trigger if exists audit_feature_flags on public.feature_flags;
create trigger audit_feature_flags
  before insert or update or delete on public.feature_flags
  for each row execute function public.write_admin_audit_log();

-- Audit tools table: INSERT, UPDATE, DELETE
drop trigger if exists audit_tools on public.tools;
create trigger audit_tools
  before insert or update or delete on public.tools
  for each row execute function public.write_admin_audit_log();

-- Audit reports table: status changes
drop trigger if exists audit_reports on public.reports;
create trigger audit_reports
  before update on public.reports
  for each row
  when (old.status is distinct from new.status)
  execute function public.write_admin_audit_log();

commit;

