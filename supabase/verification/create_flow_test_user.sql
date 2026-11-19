insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_sso_user)
values (
  gen_random_uuid(), 'authenticated', 'authenticated', 'mcp-flow-test@boostd.test',
  crypt('Bd-' || substr(md5(random()::text), 1, 16), gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{}', false
)
returning id, email
