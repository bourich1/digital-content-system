-- Run in the BoostD project's SQL editor. No credentials or other users' data
-- are returned. The private schema must NOT be added to exposed API schemas.
begin;
create schema if not exists boostd_private;
revoke all on schema boostd_private from public, anon;
grant usage on schema boostd_private to authenticated;

-- Elevated access is needed only to read the managed auth schema. Ownership
-- is always taken from the verified JWT; callers cannot supply a user ID.
create or replace function boostd_private.my_login_sessions()
returns table(id uuid, created_at timestamptz, updated_at timestamptz, user_agent text, ip text)
language sql stable security definer set search_path = ''
as $$
  select s.id, s.created_at, s.updated_at,
    pg_catalog.to_jsonb(s)->>'user_agent', pg_catalog.to_jsonb(s)->>'ip'
  from auth.sessions s
  where s.user_id = (select auth.uid())
    and (select auth.uid()) is not null
  order by s.created_at desc
  limit 50;
$$;
revoke all on function boostd_private.my_login_sessions() from public, anon;
grant execute on function boostd_private.my_login_sessions() to authenticated;

create or replace function public.get_my_login_sessions()
returns table(id uuid, created_at timestamptz, updated_at timestamptz, user_agent text, ip text)
language sql stable security invoker set search_path = ''
as $$ select * from boostd_private.my_login_sessions(); $$;
revoke all on function public.get_my_login_sessions() from public, anon;
grant execute on function public.get_my_login_sessions() to authenticated;
commit;

-- Verify after applying, with an authenticated user's JWT:
-- select * from public.get_my_login_sessions();
-- Verify anon cannot execute, and a different authenticated user only sees
-- their own sessions. Session records are not a permanent login audit history.
