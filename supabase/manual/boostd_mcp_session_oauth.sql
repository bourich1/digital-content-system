-- Install after the workspace role and original OAuth hook.
-- Populate oauth_resources separately with this environment's exact MCP URL.
begin;
create table if not exists boostd_mcp_private.oauth_resources (
  resource text primary key check (resource ~ '^https://[^/?#]+/api/mcp$')
);
create table if not exists boostd_mcp_private.oauth_session_bindings (
  session_id uuid primary key references auth.sessions(id) on delete cascade,
  user_id uuid not null,
  client_id uuid not null,
  resource text,
  granted_at timestamptz not null default now()
);
revoke all on boostd_mcp_private.oauth_resources, boostd_mcp_private.oauth_session_bindings
  from public, anon, authenticated;
alter table boostd_mcp_private.oauth_resources enable row level security;
alter table boostd_mcp_private.oauth_session_bindings enable row level security;

create or replace function boostd_mcp_private.custom_access_token(event jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  selected_resource text;
  selected_session uuid;
  selected_user uuid;
  selected_client uuid;
  request_count integer;
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
      select count(*), min(resource) into request_count, selected_resource
      from auth.oauth_authorizations
      where user_id = selected_user and client_id = selected_client
        and status = 'approved' and expires_at > now();
      if request_count <> 1 then selected_resource := null; end if;
      insert into boostd_mcp_private.oauth_session_bindings
        (session_id, user_id, client_id, resource)
      values (selected_session, selected_user, selected_client, selected_resource)
      on conflict (session_id) do update set resource = excluded.resource, granted_at = now();
    elsif event ->> 'authentication_method' = 'token_refresh' then
      select resource into selected_resource from boostd_mcp_private.oauth_session_bindings
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
