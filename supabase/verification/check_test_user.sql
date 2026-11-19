select u.email, u.email_confirmed_at is not null as confirmed, u.banned_until, u.deleted_at,
  u.is_anonymous, u.aud, u.role,
  left(u.encrypted_password, 4) as hash_prefix,
  (select count(*) from auth.identities i where i.user_id = u.id) as identities
from auth.users u
where u.email = 'mcp-flow-test@boostd.test'
