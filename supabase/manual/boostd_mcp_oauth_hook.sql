-- Install after the workspace role. Register the intended OAuth client and
-- configure its client ID and exact MCP resource in the private table.
begin;

create schema if not exists boostd_mcp_private;
revoke all on schema boostd_mcp_private from public;
grant usage on schema boostd_mcp_private to supabase_auth_admin;

create table boostd_mcp_private.oauth_clients (
  client_id uuid primary key,
  resource_url text not null check (resource_url ~ '^https://[^/?#]+/api/mcp$')
);
revoke all on boostd_mcp_private.oauth_clients from public, anon, authenticated;
grant select on boostd_mcp_private.oauth_clients to supabase_auth_admin;

create function boostd_mcp_private.custom_access_token(event jsonb)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce((
    select jsonb_set(jsonb_set(event, '{claims,aud}', to_jsonb(client.resource_url)),
      '{claims,role}', to_jsonb('boostd_mcp_workspace'::text))
    from boostd_mcp_private.oauth_clients client
    where client.client_id::text = event #>> '{claims,client_id}'
  ), event);
$$;
revoke all on function boostd_mcp_private.custom_access_token(jsonb) from public, anon, authenticated;
grant execute on function boostd_mcp_private.custom_access_token(jsonb) to supabase_auth_admin;

commit;
