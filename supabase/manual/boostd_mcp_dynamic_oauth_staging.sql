begin;

-- Install only after the workspace role and the manual OAuth hook in staging.
-- Records the MCP resource each user approved per OAuth client. The hook
-- refreshes the row while the authorization request is still visible during
-- the code exchange (GoTrue issues the token before deleting the request) and
-- reads it again on refresh grants, when the request row no longer exists.
create table if not exists boostd_mcp_private.oauth_resource_bindings (
  user_id uuid not null,
  client_id uuid not null,
  resource text not null,
  granted_at timestamptz not null default now(),
  primary key (user_id, client_id)
);
revoke all on boostd_mcp_private.oauth_resource_bindings from public, anon, authenticated;

create or replace function boostd_mcp_private.custom_access_token(event jsonb)
returns jsonb language sql volatile security definer set search_path = '' as $$
  with params as (
    select
      event #>> '{claims,session_id}' as session_id,
      event ->> 'user_id' as user_id,
      event #>> '{claims,client_id}' as client_id
  ),
  -- The approved authorization request is visible only during the code
  -- exchange: GoTrue issues the access token (running this hook) inside the
  -- same transaction, then deletes the request. Pick the newest approved
  -- request so concurrent flows fail closed instead of inheriting a stale
  -- resource audience.
  current_authorization as (
    select auth_request.resource
    from auth.oauth_authorizations auth_request
    join auth.oauth_clients client on client.id = auth_request.client_id
    where auth_request.user_id::text = (select user_id from params)
      and client.id::text = (select client_id from params)
      and auth_request.status = 'approved'
      and auth_request.resource is not null
      and client.deleted_at is null
    order by auth_request.approved_at desc nulls last
    limit 1
  ),
  -- Remember the exact resource of the newest approved request, including
  -- when it is not the Boostd MCP resource, so later refresh grants cannot
  -- inherit an audience the user did not request in the current flow.
  record as (
    insert into boostd_mcp_private.oauth_resource_bindings (user_id, client_id, resource)
    select (select user_id from params)::uuid, (select client_id from params)::uuid, current_authorization.resource
    from current_authorization
    on conflict (user_id, client_id) do update
      set resource = excluded.resource, granted_at = now()
    returning user_id, client_id, resource
  ),
  effective_bindings as (
    -- Sibling CTEs cannot see the INSERT/UPDATE through a table scan.
    -- Use RETURNING for this exchange, and persisted rows only on refresh.
    select user_id, client_id, resource from record
    union all
    select user_id, client_id, resource
    from boostd_mcp_private.oauth_resource_bindings
    where not exists (select 1 from current_authorization)
  ),
  permitted_resource as (
    -- Pre-registered clients: the private registry binds the client to its
    -- exact resource URL.
    select client.resource_url
    from boostd_mcp_private.oauth_clients client
    where client.client_id::text = (select client_id from params)
    union
    -- Dynamically registered clients: the session records the OAuth client,
    -- the consent binds the approving user, and the resource comes either
    -- from the approved request being exchanged right now or, on refresh
    -- grants, from the recorded binding for this user and client.
    select 'https://boostd-mcp-staging-tamashop848-3253s-projects.vercel.app/api/mcp'
    from auth.sessions session
    join auth.oauth_clients client on client.id = session.oauth_client_id
    join auth.oauth_consents consent on consent.client_id = client.id
      and consent.user_id = session.user_id
      and consent.revoked_at is null
    join effective_bindings binding
      on binding.user_id = session.user_id and binding.client_id = client.id
    where session.id::text = (select session_id from params)
      and session.user_id::text = (select user_id from params)
      and client.id::text = (select client_id from params)
      and client.registration_type = 'dynamic'
      and client.deleted_at is null
      and binding.resource = 'https://boostd-mcp-staging-tamashop848-3253s-projects.vercel.app/api/mcp'
      and (
        (select resource from current_authorization) = binding.resource
        or not exists (select 1 from current_authorization)
      )
  )
  select coalesce((
    select jsonb_set(jsonb_set(event, '{claims,aud}', to_jsonb(resource_url)),
      '{claims,role}', to_jsonb('boostd_mcp_workspace'::text))
    from permitted_resource
    limit 1
  ), event);
$$;

revoke all on function boostd_mcp_private.custom_access_token(jsonb) from public, anon, authenticated;
grant execute on function boostd_mcp_private.custom_access_token(jsonb) to supabase_auth_admin;

commit;
