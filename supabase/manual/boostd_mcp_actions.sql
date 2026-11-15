-- Explicit request-bound workspace action consent. Existing sessions stay read-only.
begin;
create role boostd_mcp_actions nologin noinherit;
grant boostd_mcp_actions to authenticator;
grant usage on schema public to boostd_mcp_actions;
grant execute on function public.is_admin() to boostd_mcp_actions;
create table boostd_mcp_private.action_approvals (
 authorization_id text primary key, user_id uuid not null, client_id uuid not null,
 resource text not null, expires_at timestamptz not null, consumed_session uuid
);
alter table boostd_mcp_private.action_approvals enable row level security;
revoke all on boostd_mcp_private.action_approvals from public,anon,authenticated;
alter table boostd_mcp_private.oauth_session_bindings add column access_role text not null default 'boostd_mcp_reader';
create function public.approve_mcp_workspace_actions(request_id text) returns void
language plpgsql security definer set search_path='' as $$
declare a auth.oauth_authorizations%rowtype;
begin
 if auth.uid() is null or auth.jwt()->>'client_id' is not null then raise exception 'Ordinary signed-in account required'; end if;
 select * into a from auth.oauth_authorizations where authorization_id=request_id and user_id=auth.uid() and status='pending' and expires_at>now();
 if a.id is null or not exists(select 1 from boostd_mcp_private.oauth_resources where resource=a.resource) then raise exception 'Invalid pending Boostd request'; end if;
 insert into boostd_mcp_private.action_approvals(authorization_id,user_id,client_id,resource,expires_at)
 values(a.authorization_id,a.user_id,a.client_id,a.resource,a.expires_at)
 on conflict(authorization_id) do nothing;
end $$;
revoke all on function public.approve_mcp_workspace_actions(text) from public,anon;
grant execute on function public.approve_mcp_workspace_actions(text) to authenticated;
-- Copy only reader column grants. No inheritance of account/admin roles.
do $$ declare e record; begin
 for e in select table_name,column_name from information_schema.column_privileges where grantee='boostd_mcp_reader' and privilege_type='SELECT' and table_schema='public' loop
 execute format('grant select (%I) on public.%I to boostd_mcp_actions',e.column_name,e.table_name);
 end loop;
 for e in select schemaname,tablename,policyname,roles from pg_policies where 'boostd_mcp_reader'=any(roles) and tablename in ('profiles','tools','platform_settings','collaborations') and cmd='SELECT' loop
 execute format('alter policy %I on %I.%I to %s,boostd_mcp_actions',e.policyname,e.schemaname,e.tablename,(select string_agg(quote_ident(r),', ') from unnest(e.roles) r));
 end loop;
end $$;
grant select(notes,source_url),insert(user_id,title,notes,source_url,status),update(title,notes,source_url,status),delete on public.content_ideas to boostd_mcp_actions;
grant insert(user_id,title,due_date),update(title,is_completed,due_date),delete on public.tasks to boostd_mcp_actions;
grant select(description,avatar_url,created_at),insert(user_id,name,platform,profile_url,description),update(name,platform,profile_url,description),delete on public.creators to boostd_mcp_actions;
grant select(deal_type,platform,content_type,notes),insert(user_id,brand_name,deal_type,platform,content_type,notes,status,posting_date),update(brand_name,deal_type,platform,content_type,notes,status,posting_date),delete on public.collaborations to boostd_mcp_actions;
do $$ declare t text; begin
 foreach t in array array['tasks','content_ideas','creators'] loop
 execute format('create policy mcp_actions_owner on public.%I as restrictive for all to boostd_mcp_actions using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()))',t);
 execute format('create policy mcp_actions_access on public.%I for all to boostd_mcp_actions using(true) with check(true)',t);
 end loop;
end $$;
create policy mcp_actions_collab_insert on public.collaborations for insert to boostd_mcp_actions with check(user_id=(select auth.uid()) and partner_id is null);
create policy mcp_actions_collab_update on public.collaborations for update to boostd_mcp_actions using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy mcp_actions_collab_delete on public.collaborations for delete to boostd_mcp_actions using(user_id=(select auth.uid()));
create policy mcp_actions_collab_write_guard on public.collaborations as restrictive for all to boostd_mcp_actions using(user_id=(select auth.uid()) or partner_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy mcp_actions_collab_update_guard on public.collaborations as restrictive for update to boostd_mcp_actions using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy mcp_actions_collab_delete_guard on public.collaborations as restrictive for delete to boostd_mcp_actions using(user_id=(select auth.uid()));
create or replace function boostd_mcp_private.custom_access_token(event jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  selected_resource text;
  selected_session uuid;
  selected_user uuid;
  selected_client uuid;
  request_count integer;
  selected_authorization text;
  selected_role text := 'boostd_mcp_workspace';
begin
  -- Only Auth's verified OAuth session may receive a workspace grant.
  select s.id, s.user_id, c.id into selected_session, selected_user, selected_client
  from auth.sessions s
  join auth.oauth_clients c on c.id = s.oauth_client_id and c.deleted_at is null
  where s.id::text = event #>> '{claims,session_id}'
    and s.user_id::text = event ->> 'user_id'
    and s.user_id::text = event #>> '{claims,sub}'
    and c.id::text = event #>> '{claims,client_id}'
    and exists (select 1 from auth.oauth_consents consent
      where consent.user_id = s.user_id and consent.client_id = c.id
        and consent.revoked_at is null);
  if selected_session is null then return event; end if;

  -- Preserve explicitly registered clients; Auth validates their code exchange.
  select resource_url into selected_resource from boostd_mcp_private.oauth_clients
    where client_id = selected_client;
  if selected_resource is null then
    selected_role := 'boostd_mcp_reader';
    if not exists (select 1 from auth.oauth_clients
      where id = selected_client and registration_type = 'dynamic') then return event; end if;

    if event ->> 'authentication_method' = 'oauth_provider/authorization_code' then
      -- There is no request ID in the hook input. Reject ambiguous concurrent
      -- approvals instead of choosing a possibly unrelated request.
      select count(*), min(resource), min(authorization_id) into request_count, selected_resource, selected_authorization
      from auth.oauth_authorizations
      where user_id = selected_user and client_id = selected_client
        and status = 'approved' and expires_at > now();
      if request_count <> 1 then selected_resource := null; end if;
      if selected_resource is not null and exists(select 1 from boostd_mcp_private.action_approvals
        where authorization_id=selected_authorization and user_id=selected_user and client_id=selected_client
          and resource=selected_resource and expires_at>now() and (consumed_session is null or consumed_session=selected_session)) then
        selected_role := 'boostd_mcp_actions';
        update boostd_mcp_private.action_approvals set consumed_session=selected_session where authorization_id=selected_authorization;
      end if;
      insert into boostd_mcp_private.oauth_session_bindings
        (session_id, user_id, client_id, resource, access_role)
      values (selected_session, selected_user, selected_client, selected_resource, selected_role)
      on conflict (session_id) do update set resource = excluded.resource, access_role=excluded.access_role, granted_at = now();
    elsif event ->> 'authentication_method' = 'token_refresh' then
      select resource,access_role into selected_resource,selected_role from boostd_mcp_private.oauth_session_bindings
        where session_id = selected_session and user_id = selected_user and client_id = selected_client;
    else return event;
    end if;
    if not exists (select 1 from boostd_mcp_private.oauth_resources
      where resource = selected_resource) then return event; end if;
  end if;
  return jsonb_set(jsonb_set(event, '{claims,aud}', to_jsonb(selected_resource)),
    '{claims,role}', to_jsonb(selected_role));
end;
$$;
revoke all on function boostd_mcp_private.custom_access_token(jsonb) from public, anon, authenticated;
grant execute on function boostd_mcp_private.custom_access_token(jsonb) to supabase_auth_admin;

commit;
