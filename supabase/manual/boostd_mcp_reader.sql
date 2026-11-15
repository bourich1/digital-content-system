-- Read-only role for dynamic Codex clients. Existing manual clients retain
-- their existing workspace role. No write grants or role inheritance.
begin;
do $$ begin
  if not exists (select 1 from pg_roles where rolname='boostd_mcp_reader') then
    create role boostd_mcp_reader nologin noinherit;
  end if;
end $$;
grant boostd_mcp_reader to authenticator;
grant usage on schema public to boostd_mcp_reader;
do $$
declare entry record;
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef and p.prorettype <> 'pg_catalog.event_trigger'::regtype
      and p.proname <> 'is_admin' and has_function_privilege('boostd_mcp_reader',p.oid,'EXECUTE')) then
    raise exception 'Unexpected privileged function access for reader';
  end if;
  for entry in select table_schema,table_name,column_name from information_schema.column_privileges
    where grantee='boostd_mcp_workspace' and privilege_type='SELECT' and table_schema='public'
  loop
    execute format('grant select (%I) on %I.%I to boostd_mcp_reader',entry.column_name,entry.table_schema,entry.table_name);
  end loop;
  -- Reuse exactly the reviewed read/owner policies, with no write grants.
  for entry in select schemaname,tablename,policyname,roles from pg_policies
    where 'boostd_mcp_workspace'=any(roles) and cmd in ('SELECT','ALL')
      and not ('boostd_mcp_reader'=any(roles))
  loop
    execute format('alter policy %I on %I.%I to %s, boostd_mcp_reader',
      entry.policyname,entry.schemaname,entry.tablename,
      (select string_agg(quote_ident(r),', ') from unnest(entry.roles) r));
  end loop;
  if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in ('public','storage') and c.relkind in ('r','p','v','m','f')
      and (has_any_column_privilege('boostd_mcp_reader',c.oid,'INSERT,UPDATE')
        or has_table_privilege('boostd_mcp_reader',c.oid,'DELETE,TRUNCATE,TRIGGER'))) then
    raise exception 'Reader unexpectedly has write privileges';
  end if;
end $$;
grant execute on function public.is_admin() to boostd_mcp_reader;
commit;
