insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.email,
  jsonb_build_object('email', u.email, 'sub', u.id::text), 'email', now(), now(), now()
from auth.users u
where u.email = 'mcp-flow-test@boostd.test'
  and not exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email')
returning user_id, provider
