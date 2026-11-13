-- Review and apply to an isolated test database first.
-- This file does not configure OAuth or issue tokens for the new role.
begin;

create role boostd_mcp_workspace nologin noinherit;
grant boostd_mcp_workspace to authenticator;
grant usage on schema public to boostd_mcp_workspace;

do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
      and p.prorettype <> 'pg_catalog.event_trigger'::regtype
      and has_function_privilege('boostd_mcp_workspace', p.oid, 'EXECUTE')
  ) then
    raise exception 'Review executable public SECURITY DEFINER functions before provisioning the MCP role';
  end if;
  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'storage') and c.relkind in ('r', 'p', 'v', 'm', 'f')
      and has_any_column_privilege('boostd_mcp_workspace', c.oid, 'SELECT,INSERT,UPDATE,REFERENCES')
  ) then
    raise exception 'Review inherited relation grants before provisioning the MCP role';
  end if;
  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname in
      ('tasks','content_ideas','collaborations','profiles','platform_settings','tools','creators')
      and not c.relrowsecurity
  ) then
    raise exception 'Enable RLS on all MCP tables before provisioning the MCP role';
  end if;
end;
$$;

-- Existing PUBLIC policies call this helper. Its result is limited to the
-- caller's own administrator status, and restrictive MCP policies still apply.
grant execute on function public.is_admin() to boostd_mcp_workspace;

alter table public.tasks add column if not exists due_date timestamptz;

grant select (id, user_id, title, is_completed, due_date, created_at),
  insert (user_id, title, due_date) on public.tasks to boostd_mcp_workspace;
grant select (id, user_id, title, status, created_at),
  insert (user_id, title, notes, status), update (status)
  on public.content_ideas to boostd_mcp_workspace;
grant select (id, user_id, partner_id, brand_name, posting_date, status, partner_status, created_at),
  update (posting_date) on public.collaborations to boostd_mcp_workspace;
grant select (id, can_access_tools) on public.profiles to boostd_mcp_workspace;
grant select (id, setting_value) on public.platform_settings to boostd_mcp_workspace;
grant select (id, name, url, description, logo_url, category, created_at)
  on public.tools to boostd_mcp_workspace;

alter table public.creators add column if not exists avatar_url text;
create unique index if not exists creators_owner_profile_url_idx on public.creators (user_id, profile_url);
grant select (id, user_id, name, platform, profile_url),
  insert (user_id, name, platform, profile_url) on public.creators to boostd_mcp_workspace;
create policy mcp_creators_owner on public.creators as restrictive
  for all to boostd_mcp_workspace using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and platform = 'Instagram'
    and profile_url ~ '^https://www[.]instagram[.]com/[a-z0-9._]{1,30}/$');
create policy mcp_creators_read on public.creators for select to boostd_mcp_workspace using (true);
create policy mcp_creators_insert on public.creators for insert to boostd_mcp_workspace with check (true);

-- Restrictive policies also constrain any existing permissive PUBLIC policy.
create policy mcp_tasks_owner on public.tasks as restrictive
  for all to boostd_mcp_workspace using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy mcp_tasks_read on public.tasks for select to boostd_mcp_workspace using (true);
create policy mcp_tasks_insert on public.tasks for insert to boostd_mcp_workspace with check (true);

create policy mcp_ideas_owner on public.content_ideas as restrictive
  for all to boostd_mcp_workspace using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy mcp_ideas_read on public.content_ideas for select to boostd_mcp_workspace using (true);
create policy mcp_ideas_initial_status on public.content_ideas as restrictive
  for insert to boostd_mcp_workspace with check (status = 'Idea');
create policy mcp_ideas_insert on public.content_ideas for insert to boostd_mcp_workspace
  with check (true);
create policy mcp_ideas_update on public.content_ideas for update to boostd_mcp_workspace
  using (true) with check (true);

create policy mcp_collaboration_participant on public.collaborations as restrictive
  for select to boostd_mcp_workspace
  using ((select auth.uid()) in (user_id, partner_id));
create policy mcp_collaboration_read on public.collaborations for select to boostd_mcp_workspace using (true);
create policy mcp_collaboration_owner on public.collaborations as restrictive
  for update to boostd_mcp_workspace using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy mcp_collaboration_schedule on public.collaborations for update to boostd_mcp_workspace
  using (true) with check (true);

create policy mcp_profile_owner on public.profiles as restrictive for select to boostd_mcp_workspace
  using (id = (select auth.uid()));
create policy mcp_profile_read on public.profiles for select to boostd_mcp_workspace using (true);
create policy mcp_tools_setting_only on public.platform_settings as restrictive
  for select to boostd_mcp_workspace using (id = 'tools_page');
create policy mcp_tools_setting_read on public.platform_settings
  for select to boostd_mcp_workspace using (true);
create policy mcp_catalog_access on public.tools as restrictive for select to boostd_mcp_workspace
  using (
    exists (select 1 from public.profiles
      where id = (select auth.uid()) and can_access_tools is distinct from false)
    and not exists (select 1 from public.platform_settings
      where id = 'tools_page' and setting_value->'enabled' = 'false'::jsonb)
  );
create policy mcp_catalog_read on public.tools for select to boostd_mcp_workspace using (true);

commit;
