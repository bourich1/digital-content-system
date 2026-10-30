-- 005 — Append-only administrator audit trail (P2 item 10)
-- Records who changed role/status/access, platform settings, or feature flags,
-- with the request's IP and user agent when the change came through PostgREST.
-- Idempotent.

begin;

create table if not exists public.admin_audit_log (
  id           bigint generated always as identity primary key,
  actor        uuid,
  actor_email  text,
  action       text not null,
  target_table text not null,
  target       text,
  "before"     jsonb,
  "after"      jsonb,
  ip           text,
  user_agent   text,
  created_at   timestamptz not null default now()
);

create index if not exists admin_audit_log_created_at_idx on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_actor_idx      on public.admin_audit_log (actor);

alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from public, anon, authenticated;
grant select on public.admin_audit_log to authenticated;

drop policy if exists admin_audit_log_admin_read on public.admin_audit_log;
create policy admin_audit_log_admin_read on public.admin_audit_log
  for select to authenticated
  using ((select public.is_admin()));

-- ── Writer ──────────────────────────────────────────────────────────────────
create or replace function public.write_admin_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_headers jsonb := '{}'::jsonb;
  v_target  text;
  v_action  text;
begin
  begin
    v_headers := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  exception when others then
    v_headers := '{}'::jsonb;
  end;

  v_target := coalesce(
    to_jsonb(new) ->> 'id',
    to_jsonb(new) ->> 'feature_name',
    to_jsonb(new) ->> 'setting_key'
  );

  v_action := tg_table_name || '.' || lower(tg_op);

  insert into public.admin_audit_log
    (actor, actor_email, action, target_table, target, "before", "after", ip, user_agent)
  values (
    auth.uid(),
    (select p.email from public.profiles p where p.id = auth.uid()),
    v_action,
    tg_table_name,
    v_target,
    to_jsonb(old),
    to_jsonb(new),
    nullif(btrim(split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1)), ''),
    v_headers ->> 'user-agent'
  );

  return new;
end;
$$;

-- ── Triggers ────────────────────────────────────────────────────────────────
drop trigger if exists audit_profile_privileged_changes on public.profiles;
create trigger audit_profile_privileged_changes
  before update on public.profiles
  for each row
  when (
    old.role             is distinct from new.role
    or old.status        is distinct from new.status
    or old.can_access_tools is distinct from new.can_access_tools
    or old.blocked_features is distinct from new.blocked_features
    or old.email         is distinct from new.email
  )
  execute function public.write_admin_audit_log();

drop trigger if exists audit_platform_settings on public.platform_settings;
create trigger audit_platform_settings
  before update on public.platform_settings
  for each row execute function public.write_admin_audit_log();

drop trigger if exists audit_feature_flags on public.feature_flags;
create trigger audit_feature_flags
  before update on public.feature_flags
  for each row execute function public.write_admin_audit_log();

-- ── Append-only ─────────────────────────────────────────────────────────────
create or replace function public.deny_audit_log_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'admin_audit_log is append-only' using errcode = '42501';
end;
$$;

drop trigger if exists admin_audit_log_no_update on public.admin_audit_log;
create trigger admin_audit_log_no_update
  before update or delete on public.admin_audit_log
  for each row execute function public.deny_audit_log_mutation();

commit;
