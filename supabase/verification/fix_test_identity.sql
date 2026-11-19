update auth.identities
set provider_id = user_id::text,
    identity_data = jsonb_build_object('email', identity_data->>'email', 'sub', user_id::text)
where provider = 'email'
  and user_id = (select id from auth.users where email = 'mcp-flow-test@boostd.test')
returning provider_id, user_id
