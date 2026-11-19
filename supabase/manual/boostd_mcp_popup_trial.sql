begin;
create function public.mcp_connection_completed(request_id text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null
    and auth.jwt()->>'client_id' is null
    and exists (
      select 1
      from boostd_mcp_private.action_approvals approval
      join boostd_mcp_private.oauth_session_bindings binding
        on binding.session_id = approval.consumed_session
        and binding.user_id = approval.user_id
        and binding.client_id = approval.client_id
        and binding.resource = approval.resource
      where approval.authorization_id = request_id
        and approval.user_id = auth.uid()
        and binding.access_role = 'boostd_mcp_actions'
    );
$$;
revoke all on function public.mcp_connection_completed(text) from public, anon;
grant execute on function public.mcp_connection_completed(text) to authenticated;
commit;
