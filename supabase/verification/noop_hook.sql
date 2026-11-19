create or replace function boostd_mcp_private.custom_access_token(event jsonb)
returns jsonb language sql stable security definer set search_path = '' as $$
  select event;
$$;
revoke all on function boostd_mcp_private.custom_access_token(jsonb) from public, anon, authenticated;
grant execute on function boostd_mcp_private.custom_access_token(jsonb) to supabase_auth_admin
