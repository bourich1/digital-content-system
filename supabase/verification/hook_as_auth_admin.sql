begin;
set local role supabase_auth_admin;
select boostd_mcp_private.custom_access_token(
  jsonb_build_object(
    'claims', jsonb_build_object('aud','authenticated','role','authenticated','sub','f93533a0-250c-48f2-90f2-7e52958a72b7'),
    'user_id','f93533a0-250c-48f2-90f2-7e52958a72b7'
  )
) -> 'claims' ->> 'aud' as aud_out;
reset role;
commit
