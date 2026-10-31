-- Verification for 008_comprehensive_security_hardening.sql (migration is unchanged).
-- Run THIS ENTIRE FILE in one connection, using the Supabase SQL editor/postgres
-- role after migrations 001-008. Never run as service_role or authenticated alone.
-- No permanent helper, policy change, real-user deletion, real-message deletion,
-- object upload, or file deletion occurs. Every behavioral probe rolls back its
-- own subtransaction, EVEN IF an operation unexpectedly succeeds. A surrounding
-- rollback-only subtransaction also removes ALL fixtures and their side effects.
-- Only this run's synthetic collaboration IDs are ever supplied to DELETE or
-- respond_to_collaboration. Results are copied into a PL/pgSQL variable BEFORE
-- that rollback, then reinserted into a temporary table AFTER cleanup. The outer
-- COMMIT preserves only session-local results/helpers, never application writes.
-- Context is a typed pg_temp table, NOT a CTE or rollback-created fixture. It is
-- populated and committed before tests begin, and ON COMMIT PRESERVE ROWS keeps
-- it alive across setup/probe/suite boundaries. All context/results references
-- explicitly use pg_temp; no search_path-dependent or conditional lookup exists.
-- Run standalone; do not nest this file in another application transaction.
--
-- PostgreSQL limitations: nextval()/identity sequence gaps are not rolled back.
-- Rollback cannot undo an external webhook/HTTP/email dispatched by a custom
-- trigger. The preflight reads (never executes) the collaboration, support-ticket
-- and message-reply trigger definitions and recursively reviews their callees,
-- local SELECT/INSERT/UPDATE targets, defaults, policies, indexes and downstream
-- triggers. Exact reviewed definitions are included in the three chain results.
-- PostgreSQL timezone/time functions and local RAISE EXCEPTION validation are
-- permitted; external I/O and RAISE NOTICE/logging are not. Only a small SQL/
-- PL/pgSQL subset is admitted. Unsupported syntax or effects => MANUAL_CHECK,
-- never an optimistic PASS based on a function name or a denylist alone.
-- Local validation used the handle_ticket_reply definition in the repository's
-- all_admin_queries.sql/baseline snapshot (conditional notification INSERT).
-- The other deployed definitions are NOT assumed to match local test fixtures:
-- each run reads pg_proc and returns exact pg_get_functiondef source in the
-- chain diagnostic. Fixtures validated timezone + row timeline writes, local
-- SELECT INTO/EXISTS + RAISE EXCEPTION, recursive RLS, and unsafe counterexamples.
-- Short lock/statement timeouts apply. Sequence allocations in a newly reviewed
-- trigger chain are also blocked because they survive rollback.
--
-- JWT claims below SIMULATE database authorization; they do NOT prove actual
-- MFA enrollment, JWT signature validation, or browser/API authentication.
-- Missing sample accounts/fixture prerequisites => MANUAL_CHECK, never PASS.
-- PASS for catalog checks means structural verification, not exploit proof.
--
-- EXPECTED TO ERROR (caught internally; successful rejection => PASS):
--   T03 forged collaboration INSERT: 42501 (row-level security violation).
--   T03 non-partner response RPC: 42501 / 'Not authorized'.
--   T04 forged sender & aal1 admin reply: 42501 (RLS violation).
--   T05 all nine protected-field updates by normal user: 42501 /
--       'Only administrators can change protected profile fields'.
--   T02 aal1 admin own protected-field UPDATE: 42501 / 'Two-factor...'.
--   T07 durations -1, 0, 301, NULL: 22023 / 'Invalid session duration'.
--   T08 normal/aal1 award_points: 42501 / 'Two-factor...award points'.
--   T12 normal/aal1 start/end impersonation: 42501 / 'Two-factor...'.
-- EXPECTED ZERO ROWS, usually NO PostgreSQL error:
--   T02 aal1 admin cross-user read/update; T03 partner UPDATE/DELETE.
--   These probes ALSO accept 42501 (an explicit policy/trigger rejection).
-- Internal SQLSTATEs ZV008 (probe) and ZV010 (suite) are rollback sentinels,
-- always caught; they must never escape as user-visible errors.
-- Any other SQLSTATE is reported FAIL with its message, not accepted as denial.
-- Final outputs: labeled detailed rows, then ONE summary row with counts,
-- area_summary and every test in verification_summary. The LAST statement is
-- SELECT, so Supabase SQL Editor displays the summary after one full-file run.
-- On an unexpected unhandled error, issue ROLLBACK before retrying the full file.

begin;
set local lock_timeout = '2s';
set local search_path = pg_catalog, public, pg_temp;
set local statement_timeout = '60s';
set local idle_in_transaction_session_timeout = '120s';

-- T00: Require a privileged SQL-editor session; JWT simulation must not be used
-- to accidentally test with a table-owner/BYPASSRLS identity.
do $$
begin
  if current_user <> 'postgres' then
    raise exception 'Run the whole verification as the SQL-editor postgres role; current_user=%', current_user;
  end if;
end $$;

create temporary table if not exists pg_temp.v008_results (
  test_id text primary key,
  category text not null,
  result text not null check (result in ('PASS', 'FAIL', 'MANUAL_CHECK')),
  detail text not null
) on commit preserve rows;
truncate table pg_temp.v008_results;
create temporary table if not exists pg_temp.v008_trigger_review (
  object_key text primary key,
  evidence text not null,
  definition text
) on commit preserve rows;
-- Also support rerunning in a connection that has the previous two-column table.
alter table pg_temp.v008_trigger_review add column if not exists definition text;
truncate table pg_temp.v008_trigger_review;
-- Replace only this session's old context, including a previous ON COMMIT DROP
-- definition. Explicit pg_temp qualification can never drop a public relation.
-- Creation and population happen BEFORE the suite's rollback-only boundary.
drop table if exists pg_temp.v008_context;
create temporary table pg_temp.v008_context (
  admin_id uuid, user_id uuid, partner_id uuid,
  collaboration_id uuid, delete_fixture_id uuid,
  fixture_ready boolean not null default false,
  writes_safe boolean not null default false
) on commit preserve rows;
insert into pg_temp.v008_context (admin_id, user_id, partner_id)
select
  (select id from public.profiles where role = 'admin' order by id limit 1),
  (select id from public.profiles where role = 'user' order by id limit 1),
  (select id from public.profiles where role = 'user' order by id offset 1 limit 1);

-- Helpers are TEMPORARY and SECURITY INVOKER. CREATE OR REPLACE plus TRUNCATE
-- allows another full-file run in the same connection without stale results.
create or replace function pg_temp.v008_result(p_id text, p_category text, p_ok boolean, p_detail text)
returns void language sql security invoker as $$
  insert into pg_temp.v008_results values
    (p_id, p_category, case when coalesce(p_ok, false) then 'PASS' else 'FAIL' end, p_detail);
$$;

create or replace function pg_temp.v008_manual(p_id text, p_category text, p_detail text)
returns void language sql security invoker as $$
  insert into pg_temp.v008_results values (p_id, p_category, 'MANUAL_CHECK', p_detail);
$$;

-- A query must return exactly one boolean (TRUE = assertion met).
-- For expected errors, a normal return is FAIL, even if the boolean is TRUE.
-- All changes, successful or rejected, are reverted before recording results.
create or replace function pg_temp.v008_probe(
  p_id text, p_category text, p_user uuid, p_aal text, p_sql text,
  p_expected_state text default null, p_message_pattern text default null,
  p_ready boolean default true, p_zero_or_denied boolean default false
) returns void language plpgsql security invoker as $$
declare
  v_ok boolean := false;
  v_state text;
  v_message text;
begin
  if p_user is null or not coalesce(p_ready, false) then
    perform pg_temp.v008_manual(p_id, p_category,
      'Required account/fixture/safe-trigger preflight unavailable. No probe executed.');
    return;
  end if;
  begin
    perform set_config('request.jwt.claims', jsonb_build_object(
      'sub', p_user, 'role', 'authenticated', 'aal', p_aal)::text, true);
    -- Set legacy GUCs too, so a previous SQL-editor request cannot leak into auth.uid().
    perform set_config('request.jwt.claim.sub', p_user::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    perform set_config('request.headers', '{}', true);
    set local role authenticated;
    if current_user <> 'authenticated' or auth.uid() is distinct from p_user
       or auth.jwt()->>'aal' is distinct from p_aal then
      raise exception 'JWT/role simulation failed' using errcode = 'ZV009';
    end if;
    execute p_sql into strict v_ok;
    raise exception 'rollback probe' using errcode = 'ZV008';
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate, v_message = message_text;
    -- SET ROLE, claims, RPC counters, fixtures, audit entries and ALL SQL writes
    -- inside the preceding block have now rolled back automatically.
  end;
  if v_state = 'ZV008' then
    perform pg_temp.v008_result(p_id, p_category,
      p_expected_state is null and coalesce(v_ok, false),
      case when p_expected_state is not null then 'FAIL: expected SQLSTATE ' || p_expected_state || ', operation returned normally.'
           when coalesce(v_ok, false) then 'Assertion met; probe changes rolled back.'
           else 'Assertion returned FALSE/NULL; probe changes rolled back.' end);
  else
    perform pg_temp.v008_result(p_id, p_category,
      ((p_expected_state is not null and v_state = p_expected_state)
        or (p_zero_or_denied and v_state = '42501'))
      and (p_message_pattern is null or v_message ~ p_message_pattern),
      format('SQLSTATE %s: %s [all probe writes rolled back]', v_state, v_message));
  end if;
end;
$$;

-- Grant only the temporary context to the simulated role. Results remain private
-- to the runner. No privileges on production objects are changed.
do $$
begin
  execute format('grant usage on schema %I to authenticated',
    (select nspname from pg_namespace where oid = pg_my_temp_schema()));
end $$;
grant select on pg_temp.v008_context to authenticated;

-- Read-only source normalization: strip string CONTENT before comments, so a
-- comment marker/semicolon inside a SQL literal cannot hide executable code.
-- The grammar reviewer rejects dollar quoting/dynamic SQL rather than guessing.
create or replace function pg_temp.v008_review_code(p_source text)
returns text language sql security invoker as $normalize$
  select btrim(regexp_replace(regexp_replace(regexp_replace(
    regexp_replace(lower(p_source), $rx$'(?:[^']|'')*'$rx$, $rx$''$rx$, 'g'),
    $rx$/\*[^*]*\*+(?:[^/*][^*]*\*+)*/$rx$, ' ', 'g'),
    $rx$--[^\n\r]*$rx$, ' ', 'g'), '\s+', ' ', 'g'));
$normalize$;

-- Returns an EMPTY blocker array only for positively recognized local code.
-- This is NOT a general SQL safety proof/parser. Everything outside its narrow
-- supported grammar requires manual review. pg_depend alone is insufficient:
-- PostgreSQL does not record every PL/pgSQL body dependency there.
create or replace function pg_temp.v008_review_chain(
  p_kind text, p_value text, p_path text[] default '{}'::text[]
) returns text[] language plpgsql security invoker as $review$
declare
  v_key text := p_kind || ':' || p_value;
  v_path text[] := p_path || (p_kind || ':' || p_value);
  v_blocks text[] := '{}'::text[];
  v_code text; v_body text; v_stmt text; v_expr text; v_call text;
  v_match text[]; v_schema text; v_name text; v_oid oid;
  v_count integer; r record; f record; v_config text;
  v_declarations text; v_variables text[] := '{}'::text[];
  v_query text; v_tail text;
begin
  if v_key = any(p_path) then return v_blocks; end if;
  if cardinality(p_path)>24 then return array[v_key || ': dependency depth >24; review manually']; end if;

  if p_kind='expression' then
    v_code:=pg_temp.v008_review_code(p_value);
    if v_code ~ '\mselect\M' then
      return pg_temp.v008_review_chain('query',p_value,v_path);
    end if;
    v_code:=replace(replace(v_code,'is not distinct from','is_not_distinct_from'),
      'is distinct from','is_distinct_from');
    -- Expressions cannot contain a statement, subquery, dynamic identifier,
    -- dollar-quoted program, external operator or an arbitrary type input hook.
    if v_code ~ '[;$"]' or position(chr(92) in p_value)>0
       or v_code ~ '\m(select|from|with|insert|update|delete|merge|execute|perform|call|do|copy|notify|listen|unlisten|set|reset|create|alter|drop|truncate|operator)\M'
       or v_code ~ '/\*|\*/|--' then
      return array['Unsupported statement/subquery/dynamic syntax in ' || coalesce(p_path[cardinality(p_path)],'expression')];
    end if;
    if v_code ~ '\m(nextval|setval|pg_notify|dblink[a-z_]*|http[a-z_]*|lo_export|lo_import|pg_read_file|pg_write_file)\s*\('
      or v_code ~ '\m(net|http|supabase_functions|cron|aws_lambda|storage)\.' then
      return array['External/non-rollback function or sequence/NOTIFY effect in ' || coalesce(p_path[cardinality(p_path)],'expression')];
    end if;
    for v_match in select regexp_matches(v_code,'[~!@#%^&|?+*/<>=-]+','g') loop
      if exists(select 1 from pg_operator o join pg_namespace n on n.oid=o.oprnamespace
        where o.oprname=v_match[1] and n.nspname<>'pg_catalog') then
        v_blocks:=array_append(v_blocks,'Custom/extension operator requires review: ' || v_match[1]);
      end if;
    end loop;
    for v_match in select regexp_matches(v_code,'::\s*((?:[a-z_][a-z_0-9]*\.)?[a-z_][a-z_0-9]*)','g') loop
      v_name:=regexp_replace(v_match[1],'^pg_catalog\.','');
      if v_name not in ('text','varchar','uuid','json','jsonb','int','int4','int8','integer','bigint',
        'smallint','numeric','float4','float8','real','boolean','bool','date','timestamp','timestamptz','interval') then
        v_blocks:=array_append(v_blocks,'Unreviewed cast/type input hook: ' || v_match[1]);
      end if;
    end loop;
    for v_match in select regexp_matches(v_code,'((?:[a-z_][a-z_0-9]*\.)?[a-z_][a-z_0-9]*)\s*\(','g') loop
      v_call:=v_match[1];
      -- SQL syntax forms, not arbitrary callable functions.
      if v_call in ('coalesce','nullif','greatest','least','any','all','array','in','exists',
        'and','or','not','case','when','then','else') then continue; end if;
      v_name:=regexp_replace(v_call,'^pg_catalog\.','');
      -- Positive, built-in-only boundary. Deliberately excludes nextval/setval,
      -- pg_notify, dblink, HTTP, pg_net, file/large-object APIs and session locks.
      if v_call !~ '\.' or v_call like 'pg_catalog.%' then
        if v_name in ('now','transaction_timestamp','statement_timestamp','clock_timestamp',
          'jsonb_build_object','jsonb_build_array','json_build_object','json_build_array',
          'to_jsonb','to_json','jsonb_set','jsonb_insert','jsonb_array_length',
          'array_append','array_prepend','array_length','cardinality',
          'lower','upper','btrim','ltrim','rtrim','length','substring','concat','concat_ws',
          'current_setting','gen_random_uuid','md5','replace','split_part','format',
          'date_trunc','to_char','abs','round','ceil','floor',
          'timezone','date_part','date_bin','make_date','make_time','make_timestamp',
          'make_timestamptz','to_date','to_timestamp','age','isfinite',
          'count','sum','avg','min','max') then
          -- These additions are explicit pg_catalog names, not a general
          -- "stable means safe" rule. Never admit a public/extension function
          -- just because it is marked STABLE/IMMUTABLE. Check time overloads too.
          if v_name in ('timezone','date_part','date_bin','make_date','make_time',
            'make_timestamp','make_timestamptz','to_date','to_timestamp','age','isfinite')
            and (not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                 where n.nspname='pg_catalog' and p.proname=v_name)
              or exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                 where n.nspname='pg_catalog' and p.proname=v_name and p.provolatile not in ('i','s'))) then
            v_blocks:=array_append(v_blocks,'Time function is missing or has an unreviewed volatile overload: ' || v_call);
          end if;
          if v_call !~ '\.' and exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
            where p.proname=v_name and (n.nspname='public' or n.oid=pg_my_temp_schema())) then
            v_blocks:=array_append(v_blocks,'Unqualified built-in has a custom/shadowing overload: ' || v_call);
          end if;
          continue;
        end if;
      end if;
      if v_call ~ '\.' then
        v_schema:=split_part(v_call,'.',1); v_name:=split_part(v_call,'.',2);
      else
        v_schema:='public'; v_name:=v_call;
        if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
          where p.proname=v_name and n.nspname='pg_catalog') then
          v_blocks:=array_append(v_blocks,'Built-in function outside positive safe list: ' || v_call);
          continue;
        end if;
      end if;
      if v_schema not in ('public','auth') then
        v_blocks:=array_append(v_blocks,'Unreviewed/external function boundary: ' || v_call);
        continue;
      end if;
      v_count:=0;
      -- Inspect EVERY overload: no overload-resolution assumption may hide an
      -- unsafe implementation. A helper must itself fit the same safe grammar.
      for r in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
        where n.nspname=v_schema and p.proname=v_name loop
        v_count:=v_count+1;
        v_blocks:=v_blocks || pg_temp.v008_review_chain('function',r.oid::text,v_path);
      end loop;
      if v_count=0 then v_blocks:=array_append(v_blocks,'Unresolved/unreviewed call: ' || v_call); end if;
    end loop;
    return v_blocks;

  elsif p_kind='query' then
    -- Narrow read-only SELECT/subquery grammar. No DML CTE, SELECT INTO table,
    -- foreign table, FROM-function, implicit comma join, locking or arbitrary
    -- SQL command is accepted. Each local FROM target and its RLS dependencies
    -- is inspected recursively, followed by every callable expression.
    v_query:=pg_temp.v008_review_code(p_value);
    v_query:=replace(replace(v_query,'is not distinct from','is_not_distinct_from'),
      'is distinct from','is_distinct_from');
    if v_query ~ '[;$"]' or position(chr(92) in p_value)>0
      or v_query ~ '\m(with|into|insert|update|delete|merge|execute|perform|call|do|copy|notify|listen|unlisten|set|reset|create|alter|drop|truncate|union|intersect|except|join|group|having|order|offset|for|tablesample|operator)\M' then
      return array['SELECT outside the reviewed local-read grammar in ' || coalesce(p_path[cardinality(p_path)],'query')];
    end if;
    v_body:=v_query;
    while v_body ~ '\mfrom\M' loop
      v_match:=regexp_match(v_body,'\mfrom\s+((?:public\.)?[a-z_][a-z_0-9]*)(.*)$');
      if v_match is null then return v_blocks || array['Unsupported FROM target in local SELECT']; end if;
      v_name:=v_match[1]; v_tail:=btrim(v_match[2]);
      -- Only an optional simple alias can precede WHERE/LIMIT/end/subquery ')'.
      if v_tail ~ '^as\s+' then
        v_tail:=regexp_replace(v_tail,'^as\s+[a-z_][a-z_0-9]*\s*','');
      elsif v_tail ~ '^[a-z_]' and v_tail !~ '^(where|limit)\M' then
        v_tail:=regexp_replace(v_tail,'^[a-z_][a-z_0-9]*\s*','');
      end if;
      if v_tail<>'' and v_tail !~ '^(where|limit)\M|^\)' then
        return v_blocks || array['FROM-function/comma join/unsupported SELECT clause at ' || v_name];
      end if;
      v_oid:=to_regclass('public.' || regexp_replace(v_name,'^public\.',''));
      if v_oid is null then
        v_blocks:=array_append(v_blocks,'Unresolved local SELECT relation: ' || v_name);
      else v_blocks:=v_blocks || pg_temp.v008_review_chain('read_table',v_oid::text,v_path); end if;
      v_body:=regexp_replace(v_body,'\mfrom\s+((?:public\.)?[a-z_][a-z_0-9]*)','');
    end loop;
    v_body:=regexp_replace(v_body,'\mselect\M',' ', 'g');
    v_body:=regexp_replace(v_body,'\mwhere\M',' ', 'g');
    v_body:=regexp_replace(v_body,'\mlimit\s+[0-9]+',' ', 'g');
    return v_blocks || pg_temp.v008_review_chain('expression',v_body,v_path);

  elsif p_kind='trigger' then
    select t.*,pg_get_triggerdef(t.oid) as definition into f from pg_trigger t where t.oid=p_value::oid;
    if not found then return array['Trigger disappeared during review: ' || p_value]; end if;
    v_blocks:=pg_temp.v008_review_chain('function',f.tgfoid::text,v_path);
    if f.tgqual is not null then
      -- Trigger WHEN expressions refer to both OLD and NEW. pg_get_expr with
      -- one relation OID cannot reliably deparse them; use pg_get_triggerdef.
      v_match:=regexp_match(pg_temp.v008_review_code(f.definition),
        '\mwhen\s*\((.*)\)\s+execute\s+(?:function|procedure)\s+');
      if v_match is null then
        v_blocks:=array_append(v_blocks,format('%s.%I: cannot review trigger WHEN predicate',f.tgrelid::regclass,f.tgname));
      else v_blocks:=v_blocks || pg_temp.v008_review_chain('expression',v_match[1],v_path); end if;
    end if;
    return v_blocks;

  elsif p_kind='function' then
    select p.*,l.lanname,n.nspname into f from pg_proc p
      join pg_language l on l.oid=p.prolang join pg_namespace n on n.oid=p.pronamespace
      where p.oid=p_value::oid;
    if not found then return array['Function disappeared during catalog review: ' || p_value]; end if;
    insert into pg_temp.v008_trigger_review(object_key,evidence,definition) values(v_key,
      format('%s [language=%s, body_md5=%s]',f.oid::regprocedure,f.lanname,md5(f.prosrc)),pg_get_functiondef(f.oid))
      on conflict(object_key) do nothing;
    if f.prokind<>'f' or f.lanname not in ('sql','plpgsql') or f.prosupport<>0 then
      return array[format('%s: unsupported language/kind/planner support hook',f.oid::regprocedure)];
    end if;
    foreach v_config in array coalesce(f.proconfig,'{}'::text[]) loop
      if v_config not in ('search_path=public, pg_temp','search_path=pg_catalog, public, pg_temp',
          'search_path=public','search_path=""','search_path=') then
        v_blocks:=array_append(v_blocks,format('%s: unreviewed function setting %s',f.oid::regprocedure,v_config));
      end if;
    end loop;
    v_code:=pg_temp.v008_review_code(f.prosrc);
    -- Positional SQL parameters are values, not dollar-quoted executable text.
    if f.lanname='sql' then v_code:=regexp_replace(v_code,'\$[1-9][0-9]*','arg_value','g'); end if;
    if v_code ~ '\mfrom\s+(?!public\.)[a-z_]' and exists(
      select 1 from unnest(coalesce(f.proconfig,'{}'::text[])) s
      where s like 'search_path=%' and s not in ('search_path=public, pg_temp','search_path=pg_catalog, public, pg_temp')) then
      v_blocks:=array_append(v_blocks,format('%s: unqualified SELECT target has a temp-shadowable search_path',f.oid::regprocedure));
    end if;
    if v_code ~ '\m(execute|notify|listen|unlisten|call|copy|commit|rollback|reset|open|fetch|loop|while|for)\M'
      or (v_code ~ '\mexception\M' and v_code !~ '\mraise\s+exception\M')
      or v_code ~ '\m(net|http|supabase_functions|cron|dblink|aws_lambda)\.'
      or v_code ~ '\m(pg_notify|nextval|setval|lo_export|lo_import|pg_read_file|pg_write_file)\s*\('
      or v_code ~ '[$"]|/\*|\*/|--' or position(chr(92) in f.prosrc)>0 then
      v_match:=regexp_match(v_code,
        '(\m(?:execute|notify|listen|unlisten|call|copy|commit|rollback|reset|open|fetch|loop|while|for|exception)\M|\m(?:net|http|supabase_functions|cron|dblink|aws_lambda)\.|\m(?:pg_notify|nextval|setval|lo_export|lo_import|pg_read_file|pg_write_file)\s*\()');
      return v_blocks || array[format('%s: external/non-rollback effect or unsupported construct [%s]; inspect definition (md5=%s)',
        f.oid::regprocedure,coalesce(v_match[1],'quoted identifier/dollar quoting/escape or comment syntax'),md5(f.prosrc))];
    end if;
    if f.lanname='sql' then
      if v_code !~ '^select\s+.+;?$' then return v_blocks || array[format('%s: only local SELECT statements/expressions are reviewed automatically',f.oid::regprocedure)]; end if;
      v_expr:=regexp_replace(regexp_replace(v_code,'^select\s+',''),';$','');
      return v_blocks || pg_temp.v008_review_chain('expression',v_expr,v_path);
    end if;
    if v_code like 'declare %' then
      v_match:=regexp_match(v_code,'^declare\s+(.+?)\s*begin\M');
      if v_match is null then return v_blocks || array[format('%s: unsupported DECLARE block',f.oid::regprocedure)]; end if;
      v_declarations:=v_match[1];
      foreach v_stmt in array string_to_array(v_declarations,';') loop
        v_stmt:=btrim(v_stmt); if v_stmt='' then continue; end if;
        v_match:=regexp_match(v_stmt,'^([a-z_][a-z_0-9]*)\s+(?:constant\s+)?(?:jsonb|json|text|uuid|integer|int|bigint|boolean|bool|numeric|timestamptz|timestamp|date)(?:\s+not null)?(?:\s*(?::=|=|default)\s*(.+))?$');
        if v_match is null then
          v_blocks:=array_append(v_blocks,format('%s: unsupported declaration/type/default',f.oid::regprocedure));
        else
          v_variables:=array_append(v_variables,v_match[1]);
          if v_match[2] is not null then v_blocks:=v_blocks || pg_temp.v008_review_chain('expression',v_match[2],v_path); end if;
        end if;
      end loop;
      v_code:=regexp_replace(v_code,'^declare\s+(.+?)\s*begin\M','begin');
    end if;
    if v_code !~ '^begin\M.*;\s*end;?$' then
      return v_blocks || array[format('%s: unsupported PL/pgSQL body shape',f.oid::regprocedure)];
    end if;
    v_body:=regexp_replace(regexp_replace(v_code,'^begin\s*',''),'\s*end;?$','');
    foreach v_stmt in array string_to_array(v_body,';') loop
      v_stmt:=btrim(v_stmt); if v_stmt='' then continue; end if;
      -- Peel IF/ELSIF prefixes; their conditions are independently reviewed.
      loop
        v_match:=regexp_match(v_stmt,'^(?:if|elsif)\s+(.+?)\s+then\s*');
        exit when v_match is null;
        v_blocks:=v_blocks || pg_temp.v008_review_chain('expression',v_match[1],v_path);
        v_stmt:=btrim(regexp_replace(v_stmt,'^(?:if|elsif)\s+(.+?)\s+then\s*',''));
      end loop;
      v_stmt:=btrim(regexp_replace(v_stmt,'^else\s+',''));
      if v_stmt='' or v_stmt='end if' then continue; end if;
      if v_stmt ~ '^raise\s+exception\s+' then
        -- RAISE EXCEPTION is a local rejection, not NOTIFY/logging/network I/O.
        -- Review its message/format/USING expressions too; a function hidden in
        -- an exception argument must never evade recursive source inspection.
        v_expr:=regexp_replace(v_stmt,'^raise\s+exception\s+','');
        v_blocks:=v_blocks || pg_temp.v008_review_chain('expression',v_expr,v_path); continue;
      end if;
      v_match:=regexp_match(v_stmt,'^select\s+(.+?)\s+into\s+(?:strict\s+)?([a-z_][a-z_0-9]*)\s+from\s+(.+)$');
      if v_match is not null and v_match[2]=any(v_variables) then
        if v_match[3] !~ '^public\.' and exists(select 1 from unnest(coalesce(f.proconfig,'{}'::text[])) s
          where s like 'search_path=%' and s not in ('search_path=public, pg_temp','search_path=pg_catalog, public, pg_temp')) then
          v_blocks:=array_append(v_blocks,format('%s: unqualified SELECT has a temp-shadowable search_path',f.oid::regprocedure));
        end if;
        v_blocks:=v_blocks || pg_temp.v008_review_chain('query','select ' || v_match[1] || ' from ' || v_match[3],v_path); continue;
      end if;
      v_match:=regexp_match(v_stmt,'^new\.[a-z_][a-z_0-9]*\s*(?::=|=)\s*(.+)$');
      if v_match is not null then
        v_blocks:=v_blocks || pg_temp.v008_review_chain('expression',v_match[1],v_path); continue;
      end if;
      v_match:=regexp_match(v_stmt,'^([a-z_][a-z_0-9]*)\s*(?::=|=)\s*(.+)$');
      if v_match is not null and v_match[1]=any(v_variables) then
        v_blocks:=v_blocks || pg_temp.v008_review_chain('expression',v_match[2],v_path); continue;
      end if;
      v_match:=regexp_match(v_stmt,'^return\s+(.+)$');
      if v_match is not null then
        v_blocks:=v_blocks || pg_temp.v008_review_chain('expression',v_match[1],v_path); continue;
      end if;
      v_match:=regexp_match(v_stmt,'^update\s+((?:public\.)?[a-z_][a-z_0-9]*)\s+set\s+(.+?)\s+where\s+(.+)$');
      if v_match is not null then
        if v_match[1] !~ '\.' and exists(select 1 from unnest(coalesce(f.proconfig,'{}'::text[])) s
          where s like 'search_path=%' and s not in ('search_path=public, pg_temp','search_path=pg_catalog, public, pg_temp')) then
          v_blocks:=array_append(v_blocks,format('%s: unqualified UPDATE has a temp-shadowable search_path',f.oid::regprocedure));
        end if;
        v_oid:=to_regclass('public.' || regexp_replace(v_match[1],'^public\.',''));
        if v_oid is null then v_blocks:=array_append(v_blocks,'Unresolved local UPDATE target: ' || v_match[1]);
        else v_blocks:=v_blocks || pg_temp.v008_review_chain('table',v_oid::text,v_path); end if;
        v_blocks:=v_blocks || pg_temp.v008_review_chain('expression',v_match[2],v_path)
          || pg_temp.v008_review_chain('expression',v_match[3],v_path);
        continue;
      end if;
      v_match:=regexp_match(v_stmt,'^insert into\s+((?:public\.)?[a-z_][a-z_0-9]*)\s*\([a-z_][a-z_0-9, ]*\)\s+values\s*\((.+)\)$');
      if v_match is not null then
        if v_match[1] !~ '\.' and exists(select 1 from unnest(coalesce(f.proconfig,'{}'::text[])) s
          where s like 'search_path=%' and s not in ('search_path=public, pg_temp','search_path=pg_catalog, public, pg_temp')) then
          v_blocks:=array_append(v_blocks,format('%s: unqualified INSERT target has an unreviewed/temp-shadowable search_path',f.oid::regprocedure));
        end if;
        v_oid:=to_regclass('public.' || regexp_replace(v_match[1],'^public\.',''));
        if v_oid is null then
          v_blocks:=array_append(v_blocks,format('%s: INSERT target %s not found',f.oid::regprocedure,v_match[1]));
        else
          v_blocks:=v_blocks || pg_temp.v008_review_chain('table',v_oid::text,v_path);
        end if;
        v_blocks:=v_blocks || pg_temp.v008_review_chain('expression',v_match[2],v_path); continue;
      end if;
      v_blocks:=array_append(v_blocks,format('%s: statement outside reviewed grammar (starts %s)',
        f.oid::regprocedure,left(v_stmt,100)));
    end loop;
    return v_blocks;

  elsif p_kind in ('table','read_table') then
    v_oid:=p_value::oid;
    select c.*,n.nspname into f from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.oid=v_oid;
    insert into pg_temp.v008_trigger_review(object_key,evidence) values(v_key,
      format('%s relation %s',case when p_kind='read_table' then 'read-only local' else 'local' end,v_oid::regclass)) on conflict(object_key) do nothing;
    if f.oid is null or f.relkind not in ('r','p') or f.nspname<>'public' then
      return array[format('Non-local/foreign/view/unsupported target relation: %s',p_value)];
    end if;
    if f.relam<>0 and not exists(select 1 from pg_am where oid=f.relam and amname='heap') then
      v_blocks:=array_append(v_blocks,format('%s: custom table access method requires review',v_oid::regclass));
    end if;
    if exists(select 1 from pg_rewrite where ev_class=v_oid and rulename<>'_RETURN') then
      v_blocks:=array_append(v_blocks,format('%s: rewrite rules require manual dependency review',v_oid::regclass));
    end if;
    for r in select a.attname,a.attidentity,t.typtype,n.nspname as type_schema
      from pg_attribute a join pg_type t on t.oid=a.atttypid join pg_namespace n on n.oid=t.typnamespace
      where a.attrelid=v_oid and a.attnum>0 and not a.attisdropped loop
      if p_kind='table' and r.attidentity<>'' then v_blocks:=array_append(v_blocks,format('%s.%I: identity sequence allocation survives rollback',v_oid::regclass,r.attname)); end if;
      if r.type_schema<>'pg_catalog' and r.typtype<>'e' then
        v_blocks:=array_append(v_blocks,format('%s.%I: custom type/domain I/O or constraints require review',v_oid::regclass,r.attname));
      end if;
    end loop;
    for r in
      select pg_get_expr(adbin,adrelid) as expr from pg_attrdef where adrelid=v_oid and p_kind='table'
      union all select pg_get_expr(conbin,conrelid) from pg_constraint where conrelid=v_oid and conbin is not null and p_kind='table'
      union all select pg_get_expr(indexprs,indrelid) from pg_index where indrelid=v_oid and indexprs is not null
      union all select pg_get_expr(indpred,indrelid) from pg_index where indrelid=v_oid and indpred is not null
      union all select qual from pg_policies where schemaname=f.nspname and tablename=f.relname and qual is not null
      union all select with_check from pg_policies where schemaname=f.nspname and tablename=f.relname and with_check is not null
    loop v_blocks:=v_blocks || pg_temp.v008_review_chain('expression',r.expr,v_path); end loop;
    if exists(select 1 from pg_index i cross join lateral unnest(i.indclass::oid[]) x(opc)
      join pg_opclass o on o.oid=x.opc join pg_namespace n on n.oid=o.opcnamespace
      where i.indrelid=v_oid and n.nspname<>'pg_catalog') then
      v_blocks:=array_append(v_blocks,format('%s: extension/custom index operator class requires review',v_oid::regclass));
    end if;
    -- SELECT does not execute DML triggers/defaults or FK write cascades.
    -- RLS/read expressions above still require full recursive review.
    if p_kind='read_table' then
      for r in select inhrelid as child from pg_inherits where inhparent=v_oid loop
        v_blocks:=v_blocks || pg_temp.v008_review_chain('read_table',r.child::text,v_path);
      end loop;
      return v_blocks;
    end if;
    for r in select tgname,tgfoid,tgqual,oid from pg_trigger
      where tgrelid=v_oid and not tgisinternal and tgenabled<>'D' loop
      v_blocks:=v_blocks || pg_temp.v008_review_chain('trigger',r.oid::text,v_path);
    end loop;
    -- Includes partition routing and FK cascades/set-null/set-default effects.
    for r in select inhrelid as child from pg_inherits where inhparent=v_oid
      union select conrelid from pg_constraint where contype='f' and confrelid=v_oid
        and (confdeltype in ('c','n','d') or confupdtype in ('c','n','d'))
    loop v_blocks:=v_blocks || pg_temp.v008_review_chain('table',r.child::text,v_path); end loop;
    return v_blocks;
  end if;
  return array['Unsupported dependency kind: ' || p_kind];
end;
$review$;

-- Setup commits ONLY temporary relations, helper functions and their grants.
-- This explicit boundary establishes that context/results exist independently
-- of every rollback-safe test transaction; both survive COMMIT as well.
commit;

begin;
set local lock_timeout = '2s';
set local search_path = pg_catalog, public, pg_temp;
set local statement_timeout = '60s';
set local idle_in_transaction_session_timeout = '120s';

-- Suite rollback boundary. All application writes, including fixture setup,
-- occur below inside this exception subtransaction. Diagnostic rows inside it
-- are scratch rows; v_saved_results survives rollback and is restored afterward.
do $verification_run$
declare
  v_saved_results jsonb;
begin
  begin

-- T00: Review the deployed definitions, never merely trust the new names.
-- Each requested chain has a separate diagnostic with exact definitions/hashes.
-- The aggregate can pass only when all required chains AND all other enabled
-- triggers reached by the probe tables/FK cascades/partitions have passed review.
do $$
declare
  r record; v_blocks text[] := '{}'::text[]; v_new_blocks text[];
  v_group text; v_detail text; v_evidence jsonb; v_seen integer;
  v_groups jsonb := '{"collaboration":{"blockers":[],"definitions":[],"seen":0},"support_ticket":{"blockers":[],"definitions":[],"seen":0},"message":{"blockers":[],"definitions":[],"seen":0}}'::jsonb;
begin
  for r in
    with recursive touched(oid) as (
      select c.oid from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname in (
        'profiles','collaborations','collaboration_images','support_messages',
        'support_tickets','messages','conversation_participants','conversations',
        'in_app_notifications','onboarding_surveys','focus_sessions',
        'admin_audit_log','rpc_rate_limit')
      union
      select children.oid from touched t cross join lateral (
        select inhrelid as oid from pg_inherits where inhparent=t.oid
        union select conrelid from pg_constraint where contype='f' and confrelid=t.oid
          and (confdeltype in ('c','n','d') or confupdtype in ('c','n','d'))
      ) children
    )
    select t.oid as trigger_oid,t.tgrelid,t.tgname,t.tgfoid,t.tgqual,p.proname,n.nspname
    from pg_trigger t join pg_proc p on p.oid=t.tgfoid
      join pg_namespace n on n.oid=p.pronamespace
    where t.tgrelid in (select oid from touched) and not t.tgisinternal and t.tgenabled<>'D'
    order by t.tgrelid,t.tgname
  loop
    if r.nspname='public' and r.proname in (
      'guard_profile_security_fields','write_admin_audit_log',
      'guard_read_state_only_updates','notify_on_collaboration_request',
      'notify_user_on_admin_message','auto_reply_support_message','deny_audit_log_mutation') then
      continue; -- Existing migration-reviewed trust boundary is unchanged.
    end if;
    v_group:=case when r.nspname<>'public' then null
      when r.proname in ('handle_updated_at','track_collaboration_timeline') then 'collaboration'
      when r.proname='handle_ticket_reply' then 'support_ticket'
      when r.proname='check_message_reply_same_conversation' then 'message' else null end;
    if v_group is null then
      v_blocks:=array_append(v_blocks,format('%s.%I -> %s: unknown enabled trigger requires source/side-effect review',
        r.tgrelid::regclass,r.tgname,r.tgfoid::regprocedure));
      continue;
    end if;
    truncate table pg_temp.v008_trigger_review;
    v_new_blocks:=pg_temp.v008_review_chain('trigger',r.trigger_oid::text);
    select coalesce(jsonb_agg(jsonb_build_object('object',object_key,'evidence',evidence,
      'definition',definition) order by object_key),'[]'::jsonb) into v_evidence
      from pg_temp.v008_trigger_review;
    v_groups:=jsonb_set(v_groups,array[v_group,'definitions'],v_groups#>array[v_group,'definitions'] || v_evidence);
    v_seen:=(v_groups#>>array[v_group,'seen'])::integer+1;
    v_groups:=jsonb_set(v_groups,array[v_group,'seen'],to_jsonb(v_seen));
    if cardinality(v_new_blocks)>0 then
      v_detail:=format('%s.%I -> %s: %s',r.tgrelid::regclass,r.tgname,
        r.tgfoid::regprocedure,array_to_string(v_new_blocks,'; '));
      v_blocks:=array_append(v_blocks,v_detail);
      v_groups:=jsonb_set(v_groups,array[v_group,'blockers'],
        v_groups#>array[v_group,'blockers'] || jsonb_build_array(v_detail));
    end if;
  end loop;
  foreach v_group in array array['collaboration','support_ticket','message'] loop
    v_detail:=jsonb_build_object(
      'assessment',case when jsonb_array_length(v_groups#>array[v_group,'blockers'])>0 then 'MANUAL_CHECK'
        when (v_groups#>>array[v_group,'seen'])::integer=0 then 'No enabled matching trigger is reachable; no extra chain to execute.'
        else 'PASS: deployed source and supported dependencies are transaction-local; probes still roll back.' end,
      'review',v_groups->v_group)::text;
    if jsonb_array_length(v_groups#>array[v_group,'blockers'])=0 then
      perform pg_temp.v008_result('T00.' || v_group || '_trigger_chain','preflight',true,v_detail);
    else perform pg_temp.v008_manual('T00.' || v_group || '_trigger_chain','preflight',v_detail); end if;
  end loop;
  update pg_temp.v008_context set writes_safe=cardinality(v_blocks)=0;
  if cardinality(v_blocks)=0 then
    perform pg_temp.v008_result('T00.safe_write_preflight','preflight',true,
      'Every required trigger chain passed (see the three T00.*_trigger_chain rows). PostgreSQL timezone/time formatting built-ins are local operations, not external calls. All application/fixture writes remain rollback-isolated.');
  else
    perform pg_temp.v008_manual('T00.safe_write_preflight','preflight',
      'Behavioral writes skipped. Exact blockers: ' || array_to_string(v_blocks,' | ')
      || '. See T00.*_trigger_chain for deployed definitions and dependency evidence; no trigger was executed during review.');
  end if;
end $$;

-- T14: Exact signatures, invoker/definer mode, pinned path and API ACLs.
-- guard_profile_security_fields MUST be invoker: its current_user check depends on it.
do $$
declare r record; v_oid oid; v_ok boolean;
begin
  for r in select * from (values
    ('verify_admin_access()',true), ('guard_profile_security_fields()',false),
    ('complete_onboarding(jsonb)',true), ('record_focus_session(integer)',true),
    ('award_points(uuid,integer,text)',true), ('respond_to_collaboration(uuid,text)',true),
    ('get_or_create_direct_conversation(uuid)',true), ('get_profiles_by_usernames(text[])',true),
    ('start_impersonation(uuid)',true), ('end_impersonation(uuid)',true)
  ) as x(signature, definer) loop
    v_oid := to_regprocedure('public.' || r.signature);
    select p.prosecdef = r.definer and p.prokind = 'f'
      and exists (select 1 from unnest(p.proconfig) s where s = 'search_path=public, pg_temp')
      and (not r.definer or (
        has_function_privilege('authenticated',p.oid,'EXECUTE')
        and not has_function_privilege('anon',p.oid,'EXECUTE')))
    into v_ok from pg_proc p where p.oid = v_oid;
    perform pg_temp.v008_result('T14.' || r.signature,'migration_008_loaded',
      v_oid is not null and coalesce(v_ok,false),
      'Requires exact function, expected SECURITY mode, pinned search_path, authenticated EXECUTE and no anonymous EXECUTE for RPCs.');
  end loop;
  perform pg_temp.v008_result('T14.profile_guard_trigger','migration_008_loaded', exists (
    select 1 from pg_trigger where tgrelid = to_regclass('public.profiles')
      and tgfoid = to_regprocedure('public.guard_profile_security_fields()')
      and not tgisinternal and tgenabled in ('O','A')
      and (tgtype::integer & 19) = 19 -- ROW + BEFORE + UPDATE
  ), 'Protected-field guard must be attached and enabled for ordinary UPDATE statements.');
  for r in select unnest(array['profiles','collaborations','collaboration_images',
    'support_messages','focus_sessions','rpc_rate_limit']) as tbl loop
    perform pg_temp.v008_result('T14.rls.' || r.tbl,'migration_008_loaded',
      (select relrowsecurity from pg_class where oid = to_regclass('public.' || r.tbl)),
      'RLS must be enabled.');
  end loop;
end $$;

-- T01: Role membership check is separate from MFA; admin at aal1 is still an
-- admin for verify_admin_access(), but must fail is_admin_aal2().
perform pg_temp.v008_probe('T01.user','migration_008_loaded',user_id,'aal1',
  'select public.verify_admin_access() is false') from pg_temp.v008_context;
perform pg_temp.v008_probe('T01.admin','migration_008_loaded',admin_id,'aal1',
  'select public.verify_admin_access() is true') from pg_temp.v008_context;
perform pg_temp.v008_probe('T02.user_even_aal2','admin_aal2_enforcement',user_id,'aal2',
  'select public.is_admin_aal2() is false') from pg_temp.v008_context;
perform pg_temp.v008_probe('T02.admin_aal1_predicate','admin_aal2_enforcement',admin_id,'aal1',
  'select public.is_admin_aal2() is false') from pg_temp.v008_context;
perform pg_temp.v008_probe('T02.admin_aal2_predicate','admin_aal2_enforcement',admin_id,'aal2',
  'select public.is_admin_aal2() is true') from pg_temp.v008_context;

-- T02/T05: Profile probes target a dynamically selected existing account, only
-- within the auto-rolled-back probe. No profile is inserted/deleted.
perform pg_temp.v008_probe('T02.aal1_private_read','admin_aal2_enforcement',admin_id,'aal1',
  format('select not exists(select 1 from public.profiles where id=%L::uuid)',user_id),
  p_ready := user_id is not null) from pg_temp.v008_context;
perform pg_temp.v008_probe('T02.aal1_cross_user_update','admin_aal2_enforcement',admin_id,'aal1',
  format('with changed as (update public.profiles set full_name=full_name where id=%L::uuid returning 1) select count(*)=0 from changed',user_id),
  p_ready := user_id is not null and writes_safe, p_zero_or_denied := true) from pg_temp.v008_context;
perform pg_temp.v008_probe('T02.aal1_protected_update','admin_aal2_enforcement',admin_id,'aal1',
  'with changed as (update public.profiles set can_access_tools=not coalesce(can_access_tools,false) where id=auth.uid() returning 1) select count(*)=1 from changed',
  '42501','Two-factor authentication is required',writes_safe) from pg_temp.v008_context;
perform pg_temp.v008_probe('T02.aal2_authorized_update','admin_aal2_enforcement',admin_id,'aal2',
  format('with changed as (update public.profiles set can_access_tools=not coalesce(can_access_tools,false) where id=%L::uuid returning 1) select count(*)=1 from changed',user_id),
  p_ready := user_id is not null and writes_safe) from pg_temp.v008_context;
perform pg_temp.v008_probe('T05.ordinary_update_control','profile_business_fields',user_id,'aal1',
  'with changed as (update public.profiles set full_name=full_name where id=auth.uid() returning 1) select count(*)=1 from changed',
  p_ready := writes_safe) from pg_temp.v008_context;

do $fields$
declare r record; c record;
begin
  select * into c from pg_temp.v008_context;
  for r in select * from (values
    ('role', $$'admin'$$),
    ('status', $$case when status='suspended' then 'active' else 'suspended' end$$),
    ('can_access_tools', 'not coalesce(can_access_tools,false)'),
    ('blocked_features', $$case when coalesce(blocked_features,'{}'::text[])='{}'::text[] then array['__v008_probe__']::text[] else '{}'::text[] end$$),
    ('points', 'case when points=0 then 1 else 0 end'),
    ('day_streak', 'case when day_streak=0 then 1 else 0 end'),
    ('work_hours', 'case when work_hours=0 then 1 else 0 end'),
    ('focus_sessions', 'case when focus_sessions=0 then 1 else 0 end'),
    ('survey_completed', 'not coalesce(survey_completed,false)')
  ) x(col, expr) loop
    perform pg_temp.v008_probe('T05.' || r.col,'profile_business_fields',c.user_id,'aal1',
      format('with changed as (update public.profiles set %I=%s where id=auth.uid() returning 1) select count(*)=1 from changed',r.col,r.expr),
      '42501','Only administrators can change protected profile fields',c.writes_safe);
  end loop;
end $fields$;

-- T03 fixture setup: TWO NEW collaborations, never copied production content.
-- Two ordinary profiles are needed for independent owner/partner tests.
-- Missing accounts or extra required columns => MANUAL_CHECK with error detail.
-- Defaults and ordinary SQL triggers run normally; no trigger is disabled.
do $$
declare c record; v_id uuid := gen_random_uuid(); v_delete uuid := gen_random_uuid();
  v_cols text := 'id,user_id,partner_id,partner_status'; v_vals text;
begin
  select * into c from pg_temp.v008_context;
  if c.user_id is null or c.partner_id is null or not c.writes_safe then
    perform pg_temp.v008_manual('T03.fixture','collaboration_idor',
      'Need two normal profiles and a passing safe-write preflight. No real accounts are created.');
    return;
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='collaborations' and column_name='title') then
    v_cols := v_cols || ',title';
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='collaborations' and column_name='brand_name') then
    v_cols := v_cols || ',brand_name';
  end if;
  begin
    v_vals := format('%L::uuid,%L::uuid,%L::uuid,%L',v_id,c.user_id,c.partner_id,'pending');
    if v_cols like '%,title%' then v_vals := v_vals || ',' || quote_literal('__v008_verification_only__'); end if;
    if v_cols like '%,brand_name%' then v_vals := v_vals || ',' || quote_literal('__v008_verification_only__'); end if;
    execute format('insert into public.collaborations(%s) values (%s)',v_cols,v_vals);
    execute format('insert into public.collaborations(%s) values (%s)',v_cols,
      replace(v_vals,quote_literal(v_id::text) || '::uuid',quote_literal(v_delete::text) || '::uuid'));
    update pg_temp.v008_context set collaboration_id=v_id, delete_fixture_id=v_delete, fixture_ready=true;
    perform pg_temp.v008_result('T03.fixture','collaboration_idor',true,
      'Two synthetic rows created; only these IDs may be deleted. Outer ROLLBACK removes fixtures/notifications.');
  exception when others then
    perform pg_temp.v008_manual('T03.fixture','collaboration_idor',
      format('Fixture setup rolled back (%s: %s). Adapt synthetic fixture to deployed schema; never substitute a real collaboration ID.',sqlstate,sqlerrm));
  end;
end $$;

perform pg_temp.v008_probe('T03.owner_read','collaboration_idor',user_id,'aal1',
  format('select exists(select 1 from public.collaborations where id=%L::uuid)',collaboration_id),p_ready:=fixture_ready) from pg_temp.v008_context;
perform pg_temp.v008_probe('T03.owner_update','collaboration_idor',user_id,'aal1',
  format('with changed as (update public.collaborations set notes=%L where id=%L::uuid returning 1) select count(*)=1 from changed','__v008_owner_update__',collaboration_id),p_ready:=fixture_ready) from pg_temp.v008_context;
perform pg_temp.v008_probe('T03.owner_delete_fixture','collaboration_idor',user_id,'aal1',
  format('with changed as (delete from public.collaborations where id=%L::uuid returning 1) select count(*)=1 from changed',delete_fixture_id),p_ready:=fixture_ready) from pg_temp.v008_context;
perform pg_temp.v008_probe('T03.partner_read','collaboration_idor',partner_id,'aal1',
  format('select exists(select 1 from public.collaborations where id=%L::uuid)',collaboration_id),p_ready:=fixture_ready) from pg_temp.v008_context;
perform pg_temp.v008_probe('T03.partner_delete_denied','collaboration_idor',partner_id,'aal1',
  format('with changed as (delete from public.collaborations where id=%L::uuid returning 1) select count(*)=0 from changed',delete_fixture_id),p_ready:=fixture_ready,p_zero_or_denied:=true) from pg_temp.v008_context;
perform pg_temp.v008_probe('T03.partner_owner_fields_denied','collaboration_idor',partner_id,'aal1',
  format('with changed as (update public.collaborations set notes=%L where id=%L::uuid returning 1) select count(*)=0 from changed','__v008_partner_tamper__',collaboration_id),p_ready:=fixture_ready,p_zero_or_denied:=true) from pg_temp.v008_context;
perform pg_temp.v008_probe('T03.partner_ownership_transfer_denied','collaboration_idor',partner_id,'aal1',
  format('with changed as (update public.collaborations set user_id=auth.uid() where id=%L::uuid returning 1) select count(*)=0 from changed',collaboration_id),p_ready:=fixture_ready,p_zero_or_denied:=true) from pg_temp.v008_context;
perform pg_temp.v008_probe('T03.partner_direct_status_denied','collaboration_idor',partner_id,'aal1',
  format('with changed as (update public.collaborations set partner_status=%L where id=%L::uuid returning 1) select count(*)=0 from changed','accepted',collaboration_id),p_ready:=fixture_ready,p_zero_or_denied:=true) from pg_temp.v008_context;
-- Clone only the SYNTHETIC row (all required fixture fields are retained).
perform pg_temp.v008_probe('T03.forged_owner_insert','collaboration_idor',partner_id,'aal1',
  format('with changed as (insert into public.collaborations select (jsonb_populate_record(null::public.collaborations,to_jsonb(c)||jsonb_build_object(''id'',gen_random_uuid()))).* from public.collaborations c where id=%L::uuid returning 1) select count(*)=1 from changed',collaboration_id),
  '42501',p_ready:=fixture_ready) from pg_temp.v008_context;
perform pg_temp.v008_probe('T03.owner_not_partner_rpc','collaboration_idor',user_id,'aal1',
  format('select public.respond_to_collaboration(%L::uuid,''accepted'') is null',collaboration_id),
  '42501','Not authorized',fixture_ready) from pg_temp.v008_context;

-- Helper for multi-statement RPC assertions. It remains SECURITY INVOKER so
-- probes exercise actual authenticated table grants, RLS and RPC permissions.
create function pg_temp.v008_rpc_assert(p_case text, p_value integer default null)
returns boolean language plpgsql security invoker as $$
declare c record; b public.profiles%rowtype; a public.profiles%rowtype;
  v_before bigint; v_after bigint; v_doc jsonb; v_id uuid;
begin
  select * into c from pg_temp.v008_context;
  if p_case in ('onboarding','focus') then
    select * into strict b from public.profiles where id=auth.uid();
    if p_case='onboarding' then
      select count(*) into v_before from public.onboarding_surveys where user_id=auth.uid();
      perform public.complete_onboarding(jsonb_build_object('source','__v008_verification_only__',
        'goals',jsonb_build_array('security verification'),'satisfaction',3));
      select * into strict a from public.profiles where id=auth.uid();
      select count(*) into v_after from public.onboarding_surveys where user_id=auth.uid();
      return a.survey_completed is true and v_after=v_before+1
        and (to_jsonb(a)-'survey_completed')=(to_jsonb(b)-'survey_completed');
    end if;
    select count(*) into v_before from public.focus_sessions where user_id=auth.uid();
    perform public.record_focus_session(p_value);
    select * into strict a from public.profiles where id=auth.uid();
    select count(*) into v_after from public.focus_sessions where user_id=auth.uid();
    return v_after=v_before+1
      and a.focus_sessions=coalesce(b.focus_sessions,0)+1
      and a.work_hours=coalesce(b.work_hours,0)+(p_value/60)
      and a.points=coalesce(b.points,0)+(p_value/5)*2
      and a.day_streak=coalesce(b.day_streak,0)+1;
  elsif p_case='award' then
    select * into strict b from public.profiles where id=c.user_id;
    select count(*) into v_before from public.admin_audit_log
      where actor=auth.uid() and action='points.award' and target=c.user_id::text;
    perform public.award_points(c.user_id,2,'__v008_verification_only__');
    select * into strict a from public.profiles where id=c.user_id;
    select count(*) into v_after from public.admin_audit_log
      where actor=auth.uid() and action='points.award' and target=c.user_id::text;
    return a.points=coalesce(b.points,0)+2 and v_after=v_before+1;
  elsif p_case='partner_accept' then
    perform public.respond_to_collaboration(c.collaboration_id,'accepted');
    return exists(select 1 from public.collaborations
      where id=c.collaboration_id and user_id=c.user_id and partner_id=auth.uid() and partner_status='accepted');
  elsif p_case='partner_decline' then
    perform public.respond_to_collaboration(c.delete_fixture_id,'declined');
    return not exists(select 1 from public.collaborations where id=c.delete_fixture_id);
  elsif p_case='impersonation' then
    select count(*) into v_before from public.admin_audit_log
      where actor=auth.uid() and target=c.user_id::text and action='view_as_user.start';
    v_doc := public.start_impersonation(c.user_id);
    select count(*) into v_after from public.admin_audit_log
      where actor=auth.uid() and target=c.user_id::text and action='view_as_user.start';
    if v_doc->>'id' is distinct from c.user_id::text or v_after<>v_before+1 then return false; end if;
    select count(*) into v_before from public.admin_audit_log
      where actor=auth.uid() and target=c.user_id::text and action='view_as_user.exit';
    perform public.end_impersonation(c.user_id);
    select count(*) into v_after from public.admin_audit_log
      where actor=auth.uid() and target=c.user_id::text and action='view_as_user.exit';
    return v_after=v_before+1;
  end if;
  raise exception 'Unknown verification RPC case';
end $$;

perform pg_temp.v008_probe('T03.partner_rpc_accept','collaboration_idor',partner_id,'aal1',
  'select pg_temp.v008_rpc_assert(''partner_accept'')',p_ready:=fixture_ready) from pg_temp.v008_context;
perform pg_temp.v008_probe('T03.partner_rpc_decline_fixture','collaboration_idor',partner_id,'aal1',
  'select pg_temp.v008_rpc_assert(''partner_decline'')',p_ready:=fixture_ready) from pg_temp.v008_context;

-- T04: Every INSERT is a fresh marker message, rolled back by the probe.
perform pg_temp.v008_probe('T04.normal_sender_control','support_sender_integrity',user_id,'aal1',
  'with added as (insert into public.support_messages(user_id,sender_id,content) values(auth.uid(),auth.uid(),''__v008_verification_only__'') returning 1) select count(*)=1 from added',p_ready:=writes_safe) from pg_temp.v008_context;
perform pg_temp.v008_probe('T04.forged_sender','support_sender_integrity',user_id,'aal1',
  format('with added as (insert into public.support_messages(user_id,sender_id,content) values(auth.uid(),%L::uuid,''__v008_forged_sender__'') returning 1) select count(*)=1 from added',admin_id),
  '42501',p_ready:=admin_id is not null and writes_safe) from pg_temp.v008_context;
perform pg_temp.v008_probe('T04.admin_aal1_reply','support_sender_integrity',admin_id,'aal1',
  format('with added as (insert into public.support_messages(user_id,sender_id,content) values(%L::uuid,auth.uid(),''__v008_admin_reply__'') returning 1) select count(*)=1 from added',user_id),
  '42501',p_ready:=user_id is not null and writes_safe) from pg_temp.v008_context;
perform pg_temp.v008_probe('T04.admin_aal2_reply','support_sender_integrity',admin_id,'aal2',
  format('with added as (insert into public.support_messages(user_id,sender_id,content) values(%L::uuid,auth.uid(),''__v008_admin_reply__'') returning 1) select count(*)=1 from added',user_id),
  p_ready:=user_id is not null and writes_safe) from pg_temp.v008_context;
perform pg_temp.v008_probe('T04.admin_aal2_still_cannot_forge_sender','support_sender_integrity',admin_id,'aal2',
  format('with added as (insert into public.support_messages(user_id,sender_id,content) values(%L::uuid,%L::uuid,''__v008_forged_sender__'') returning 1) select count(*)=1 from added',user_id,user_id),
  '42501',p_ready:=user_id is not null and writes_safe) from pg_temp.v008_context;

-- T06/T07: Actual RPC effects are checked before each probe rollback.
perform pg_temp.v008_probe('T06.complete_onboarding','verified_rpcs',user_id,'aal1',
  'select pg_temp.v008_rpc_assert(''onboarding'')',p_ready:=writes_safe) from pg_temp.v008_context;
perform pg_temp.v008_probe('T07.valid_60_minutes','verified_rpcs',user_id,'aal1',
  'select pg_temp.v008_rpc_assert(''focus'',60)',p_ready:=writes_safe) from pg_temp.v008_context;
perform pg_temp.v008_probe('T07.valid_300_boundary','verified_rpcs',user_id,'aal1',
  'select pg_temp.v008_rpc_assert(''focus'',300)',p_ready:=writes_safe) from pg_temp.v008_context;
perform pg_temp.v008_probe('T07.invalid_' || coalesce(n::text,'null'),'verified_rpcs',c.user_id,'aal1',
  format('select public.record_focus_session(%L::integer) is null',n),
  '22023','Invalid session duration',c.writes_safe)
from pg_temp.v008_context c cross join unnest(array[-1,0,301,null]::integer[]) n;
-- T05.points/focus_sessions/work_hours/day_streak prove direct counter writes fail.
-- This does not establish that time actually elapsed; 008 trusts the duration.

-- T08: Negative tests call award_points directly (no privileged reads first).
perform pg_temp.v008_probe('T08.user_award_denied','verified_rpcs',user_id,'aal1',
  format('select public.award_points(%L::uuid,2,''__v008_verification_only__'') is null',user_id),
  '42501','Two-factor authentication is required to award points',writes_safe) from pg_temp.v008_context;
perform pg_temp.v008_probe('T08.aal1_admin_award_denied','verified_rpcs',admin_id,'aal1',
  format('select public.award_points(%L::uuid,2,''__v008_verification_only__'') is null',user_id),
  '42501','Two-factor authentication is required to award points',user_id is not null and writes_safe) from pg_temp.v008_context;
perform pg_temp.v008_probe('T08.aal2_admin_award','verified_rpcs',admin_id,'aal2',
  'select pg_temp.v008_rpc_assert(''award'')',p_ready:=user_id is not null and writes_safe) from pg_temp.v008_context;

-- T09: Inspect actual function bodies/ACLs/table configuration, without calling
-- or seeding the rate limiter. Thresholds: conversations=20, responses=20,
-- username lookups=30 per minute. Text checks are structural evidence only.
do $$
declare r record; v_oid oid; v_body text; v_ok boolean;
begin
  for r in select * from (values
    ('get_or_create_direct_conversation(uuid)','get_or_create_direct_conversation',20),
    ('respond_to_collaboration(uuid,text)','respond_to_collaboration',20),
    ('get_profiles_by_usernames(text[])','get_profiles_by_usernames',30)
  ) x(signature,operation,threshold) loop
    v_oid:=to_regprocedure('public.' || r.signature);
    select lower(prosrc) into v_body from pg_proc where oid=v_oid;
    v_ok:=v_body like '%insert into public.rpc_rate_limit%'
      and v_body like '%' || quote_literal(r.operation) || '%'
      and v_body like '%on conflict (user_id, operation) do update%'
      and v_body like '%public.rpc_rate_limit.calls + 1%'
      and v_body ~ 'date_trunc\(''minute'',\s*now\(\)\)'
      and v_body ~ ('v_calls\s*>\s*' || r.threshold || '\M')
      and v_body like '%53400%' and v_body like '%auth.uid() is null%';
    perform pg_temp.v008_result('T09.definition.' || r.operation,'rpc_rate_limits',v_ok,
      format('Definition inspection: authenticated, atomic per-user operation counter, minute window, threshold %s, SQLSTATE 53400. No throttle traffic generated.',r.threshold));
  end loop;
  perform pg_temp.v008_result('T09.counter_table','rpc_rate_limits',
    (select relrowsecurity from pg_class where oid=to_regclass('public.rpc_rate_limit'))
    and not has_table_privilege('authenticated','public.rpc_rate_limit','INSERT,UPDATE,DELETE,TRUNCATE')
    and not has_table_privilege('anon','public.rpc_rate_limit','INSERT,UPDATE,DELETE,TRUNCATE')
    and exists(select 1 from pg_constraint where conrelid=to_regclass('public.rpc_rate_limit')
      and contype in ('p','u') and pg_get_constraintdef(oid)='PRIMARY KEY (user_id, operation)'),
    'RLS, client write revocations and unique (user_id, operation) key required.');
  perform pg_temp.v008_manual('T09.operational_limit','rpc_rate_limits_runtime',
    'No burst test. Review thresholds against traffic requirements. An RPC exception rolls back its own counter increment; failed calls may not consume quota.');
end $$;

-- T10: Catalog-only storage checks. Never insert/update/delete storage.objects
-- directly: SQL metadata writes do not exercise the Storage API/object store.
do $$
declare v_bucket record; r record; v_p record; v_owner text;
begin
  select * into v_bucket from storage.buckets where id='collaboration_images';
  perform pg_temp.v008_result('T10.bucket','collaboration_images_security',v_bucket.id is not null,'Bucket must exist.');
  perform pg_temp.v008_result('T10.size','collaboration_images_security',v_bucket.file_size_limit=5242880,'Exactly 5 MiB (5,242,880 bytes), matching 008.');
  perform pg_temp.v008_result('T10.mime','collaboration_images_security',
    v_bucket.allowed_mime_types @> array['image/png','image/jpeg','image/webp']::text[]
    and v_bucket.allowed_mime_types <@ array['image/png','image/jpeg','image/webp']::text[]
    and cardinality(v_bucket.allowed_mime_types)=3,'Exact allowed MIME set, no extra types.');
  select case when exists(select 1 from information_schema.columns where table_schema='storage' and table_name='objects' and column_name='owner_id') then 'owner_id' else 'owner' end into v_owner;
  for r in select * from (values
    ('collab_images_insert_path_guard','INSERT'),
    ('collab_images_update_guard','UPDATE'),
    ('collab_images_delete_guard','DELETE')
  ) x(policy,cmd) loop
    select * into v_p from pg_policies where schemaname='storage' and tablename='objects' and policyname=r.policy;
    perform pg_temp.v008_result('T10.' || r.policy,'collaboration_images_security',
      v_p.policyname is not null and v_p.permissive='RESTRICTIVE' and v_p.cmd=r.cmd
      and v_p.roles @> array['anon','authenticated']::name[]
      and case when r.cmd='INSERT' then
        v_p.with_check like '%collaboration_images%' and v_p.with_check like '%foldername(name)%'
        and v_p.with_check ~ '\[1\]' and v_p.with_check like '%auth.uid()%'
      else v_p.qual like '%collaboration_images%' and v_p.qual like '%' || v_owner || '%'
        and v_p.qual like '%auth.uid()%'
        and (r.cmd<>'UPDATE' or (v_p.with_check like '%' || v_owner || '%' and v_p.with_check like '%auth.uid()%'))
        and (r.cmd<>'DELETE' or v_p.qual like '%is_admin_aal2()%') end,
      'Restrictive guard, correct command/roles, scoped bucket and identity condition required; inspect definitions below too.');
  end loop;
  perform pg_temp.v008_result('T10.storage_rls','collaboration_images_security',
    (select relrowsecurity from pg_class where oid=to_regclass('storage.objects')),'Storage RLS must be enabled.');
  perform pg_temp.v008_manual('T10.storage_api','storage_api_runtime',
    'Catalog checks only. Actual size/MIME enforcement, permissive insert policy and uploads require a disposable Storage API test. No files touched.');
end $$;

-- T10 additional predicate probes: evaluate the DEPLOYED policy expressions
-- against synthetic rows without touching storage.objects or uploading a file.
-- This catches an accidental OR TRUE or wrong folder comparison that a text
-- search alone would miss. These test restrictive guards, not API availability.
do $$
declare c record; v_insert text; v_update text; v_check text; v_delete text;
  v_row text; v_other_row text;
begin
  select * into c from pg_temp.v008_context;
  select with_check into v_insert from pg_policies where schemaname='storage'
    and tablename='objects' and policyname='collab_images_insert_path_guard';
  select qual,with_check into v_update,v_check from pg_policies where schemaname='storage'
    and tablename='objects' and policyname='collab_images_update_guard';
  select qual into v_delete from pg_policies where schemaname='storage'
    and tablename='objects' and policyname='collab_images_delete_guard';
  perform pg_temp.v008_probe('T10.path_own_folder','collaboration_images_security',c.user_id,'aal1',
    format('select (%s) is true from (select ''collaboration_images''::text bucket_id,auth.uid()::text || ''/probe.png'' as name) o',v_insert),
    p_ready:=v_insert is not null);
  perform pg_temp.v008_probe('T10.path_foreign_folder','collaboration_images_security',c.user_id,'aal1',
    format('select (%s) is not true from (select ''collaboration_images''::text bucket_id,%L::text || ''/probe.png'' as name) o',v_insert,c.admin_id),
    p_ready:=v_insert is not null and c.admin_id is not null);
  perform pg_temp.v008_probe('T10.path_root_denied','collaboration_images_security',c.user_id,'aal1',
    format('select (%s) is not true from (select ''collaboration_images''::text bucket_id,''probe.png''::text as name) o',v_insert),
    p_ready:=v_insert is not null);
  -- Provide both historical storage owner column names; the real deployed
  -- predicate selects whichever name migration 008 resolved for this database.
  v_row := ' from (select ''collaboration_images''::text bucket_id,auth.uid()::text owner_id,auth.uid() owner) o';
  v_other_row := format(' from (select ''collaboration_images''::text bucket_id,%L::text owner_id,%L::uuid owner) o',c.user_id,c.user_id);
  perform pg_temp.v008_probe('T10.owner_update_guard','collaboration_images_security',c.user_id,'aal1',
    format('select (%s) is true and (%s) is true',v_update,v_check) || v_row,
    p_ready:=v_update is not null and v_check is not null);
  perform pg_temp.v008_probe('T10.foreign_update_guard','collaboration_images_security',c.admin_id,'aal2',
    format('select (%s) is not true and (%s) is not true',v_update,v_check) || v_other_row,
    p_ready:=v_update is not null and v_check is not null and c.user_id is not null);
  perform pg_temp.v008_probe('T10.owner_delete_guard','collaboration_images_security',c.user_id,'aal1',
    format('select (%s) is true',v_delete) || v_row,p_ready:=v_delete is not null);
  perform pg_temp.v008_probe('T10.aal1_foreign_delete_guard','collaboration_images_security',c.admin_id,'aal1',
    format('select (%s) is not true',v_delete) || v_other_row,p_ready:=v_delete is not null and c.user_id is not null);
  perform pg_temp.v008_probe('T10.aal2_foreign_delete_guard','collaboration_images_security',c.admin_id,'aal2',
    format('select (%s) is true',v_delete) || v_other_row,p_ready:=v_delete is not null and c.user_id is not null);
end $$;

-- T11: 003 used <table>_admin_only while 008 creates legacy_admin_only_<table>.
-- Inspect ALL policies, since permissive policies combine with OR. An old plain
-- is_admin() policy MUST produce FAIL instead of being hidden by the new policy.
do $$
declare v_tbl text; v_bad text;
begin
  foreach v_tbl in array array['categories','products','product_images','product_variants',
    'ads','coupons','orders','order_items','content_items'] loop
    if to_regclass('public.' || v_tbl) is null then
      perform pg_temp.v008_manual('T11.' || v_tbl,'legacy_tables','Table absent; 008 intentionally skips missing legacy tables.');
      continue;
    end if;
    select string_agg(policyname,', ') into v_bad from pg_policies
      where schemaname='public' and tablename=v_tbl
      and (coalesce(qual,'') || ' ' || coalesce(with_check,'')) ~ '\mis_admin\s*\(';
    perform pg_temp.v008_result('T11.' || v_tbl,'legacy_tables',v_bad is null
      and (select relrowsecurity from pg_class where oid=to_regclass('public.' || v_tbl))
      and exists(select 1 from pg_policies where schemaname='public' and tablename=v_tbl
        and policyname='legacy_admin_only_' || v_tbl and cmd='ALL'
        and qual like '%is_admin_aal2()%' and with_check like '%is_admin_aal2()%')
      and not exists(select 1 from pg_policies where schemaname='public' and tablename=v_tbl
        and permissive='PERMISSIVE' and (coalesce(qual,'')='true' or coalesce(with_check,'')='true')),
      coalesce('Unsafe plain is_admin() policies remain: ' || v_bad,
        'Requires AAL2 policy, RLS and no plain is_admin()/unconditional permissive bypass.'));
  end loop;
end $$;

-- T12: Denied impersonation calls should error before any audit insert.
do $$
declare c record; v_fn text;
begin
  select * into c from pg_temp.v008_context;
  foreach v_fn in array array['start_impersonation','end_impersonation'] loop
    perform pg_temp.v008_probe('T12.user_' || v_fn,'impersonation_audit',c.user_id,'aal1',
      format('select public.%I(%L::uuid) is null',v_fn,c.user_id),
      '42501','Two-factor authentication is required',c.writes_safe);
    perform pg_temp.v008_probe('T12.aal1_' || v_fn,'impersonation_audit',c.admin_id,'aal1',
      format('select public.%I(%L::uuid) is null',v_fn,c.user_id),
      '42501','Two-factor authentication is required',c.user_id is not null and c.writes_safe);
  end loop;
end $$;
perform pg_temp.v008_probe('T12.aal2_start_exit_audit','impersonation_audit',admin_id,'aal2',
  'select pg_temp.v008_rpc_assert(''impersonation'')',p_ready:=user_id is not null and writes_safe) from pg_temp.v008_context;

-- T13: Check the actual event masks, row-level timing, WHEN conditions, target
-- function and enabled state. Reports intentionally only audit status UPDATE;
-- profiles intentionally audit protected UPDATE and DELETE, not every INSERT.
do $$
declare r record; v_t record;
begin
  for r in select * from (values
    ('profiles','audit_profile_privileged_changes',19,'role'),
    ('profiles','audit_profile_delete',11,null),
    ('platform_settings','audit_platform_settings',31,null),
    ('feature_flags','audit_feature_flags',31,null),
    ('tools','audit_tools',31,null),
    ('reports','audit_reports',19,'status')
  ) x(tbl,trg,mask,when_column) loop
    select t.*,pg_get_triggerdef(t.oid) as definition into v_t from pg_trigger t
      where t.tgrelid=to_regclass('public.' || r.tbl) and t.tgname=r.trg and not t.tgisinternal;
    perform pg_temp.v008_result('T13.' || r.trg,'admin_audit_coverage',
      v_t.tgname is not null and v_t.tgenabled in ('O','A') and v_t.tgtype::integer=r.mask
      and v_t.tgfoid=to_regprocedure('public.write_admin_audit_log()')
      and (r.when_column is null or (v_t.tgqual is not null and v_t.definition like '%' || r.when_column || '%')),
      'Must match migration 008 event mask, enabled BEFORE ROW writer and expected WHEN condition.');
  end loop;
end $$;

    -- Variables survive exception-subtransaction rollback; table rows do not.
    select coalesce(jsonb_agg(to_jsonb(r) order by r.test_id), '[]'::jsonb)
      into v_saved_results from pg_temp.v008_results r;
    raise exception 'rollback suite fixtures and application side effects'
      using errcode = 'ZV010';
  exception when sqlstate 'ZV010' then
    null; -- Expected: all application writes and scratch results are now undone.
  end;

  -- This insert is OUTSIDE the rolled-back subtransaction. Only temporary
  -- diagnostics survive; no production mutation can reach the outer COMMIT.
  insert into pg_temp.v008_results(test_id,category,result,detail)
  select test_id,category,result,detail
  from jsonb_to_recordset(v_saved_results)
    as saved(test_id text,category text,result text,detail text);
end;
$verification_run$;

-- Application/fixture writes have ALREADY rolled back. Commit only temporary
-- diagnostics/helpers; context AND results remain session-scoped TEMP tables.
commit;

-- Output 1: Raw policy/trigger definitions for interpreting structural checks.
select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
from pg_policies where (schemaname='storage' and policyname like 'collab_images_%')
  or (schemaname='public' and tablename in ('collaborations','support_messages'))
order by schemaname,tablename,policyname;
select tgrelid::regclass as relation,tgname,pg_get_triggerdef(oid) as definition
from pg_trigger where not tgisinternal and tgname in ('audit_profile_privileged_changes',
  'audit_profile_delete','audit_platform_settings','audit_feature_flags','audit_tools','audit_reports');

-- Output 2: Human-readable table. All diagnostics also appear in the FINAL
-- row's verification_summary if the editor displays only the last result set.
select test_id,category as area,result as status,detail as details
from pg_temp.v008_results order by test_id;

-- Output 3: FAIL dominates MANUAL_CHECK, which dominates PASS. Missing test data
-- and structural-only runtime gaps are visible; no optimistic blanket PASS.
with memberships as (
  select category as summary_key,result from pg_temp.v008_results
  union all select 'admin_aal2_enforcement',result from pg_temp.v008_results
    where test_id in ('T04.admin_aal1_reply','T04.admin_aal2_reply',
      'T08.aal1_admin_award_denied','T08.aal2_admin_award',
      'T12.aal1_start_impersonation','T12.aal1_end_impersonation','T12.aal2_start_exit_audit')
  union all select 'verified_rpcs',result from pg_temp.v008_results
    where test_id in ('T05.survey_completed','T05.points','T05.day_streak','T05.work_hours','T05.focus_sessions')
  union all select 'migration_008_loaded',result from pg_temp.v008_results
    where category in ('rpc_rate_limits','admin_audit_coverage') or test_id='T10.bucket'
), summary as (
  select summary_key,case when bool_or(result='FAIL') then 'FAIL'
    when bool_or(result='MANUAL_CHECK') then 'MANUAL_CHECK' else 'PASS' end as result
  from memberships group by summary_key
), area_output as (
select jsonb_build_object(
  'migration_008_loaded',(select result from summary where summary_key='migration_008_loaded'),
  'admin_aal2_enforcement',(select result from summary where summary_key='admin_aal2_enforcement'),
  'collaboration_idor',(select result from summary where summary_key='collaboration_idor'),
  'support_sender_integrity',(select result from summary where summary_key='support_sender_integrity'),
  'profile_business_fields',(select result from summary where summary_key='profile_business_fields'),
  'verified_rpcs',(select result from summary where summary_key='verified_rpcs'),
  'rpc_rate_limits',(select result from summary where summary_key='rpc_rate_limits'),
  'collaboration_images_security',(select result from summary where summary_key='collaboration_images_security'),
  'impersonation_audit',(select result from summary where summary_key='impersonation_audit'),
  'admin_audit_coverage',(select result from summary where summary_key='admin_audit_coverage'),
  'legacy_tables',(select result from summary where summary_key='legacy_tables'),
  'runtime_mfa_and_storage_api','MANUAL_CHECK',
  'pass_count',(select count(*) from pg_temp.v008_results where result='PASS'),
  'fail_count',(select count(*) from pg_temp.v008_results where result='FAIL'),
  'manual_check_count',(select count(*) from pg_temp.v008_results where result='MANUAL_CHECK'),
  'transaction_outcome','All application and fixture writes rolled back; temporary results preserved',
  'scope','Database authorization simulation; structural checks labeled in details'
) as area_summary
), totals as (
  select
    case
      when count(*) filter (where result='FAIL') > 0 then 'FAIL'
      when count(*) filter (where result='MANUAL_CHECK') > 0 then 'MANUAL_CHECK'
      when count(*) > 0 then 'PASS'
      else 'MANUAL_CHECK'
    end as overall_status,
    count(*) filter (where result='PASS') as passed,
    count(*) filter (where result='FAIL') as failed,
    count(*) filter (where result='MANUAL_CHECK') as manual_checks,
    coalesce(jsonb_object_agg(test_id,jsonb_build_object(
      'area',category,'status',result,'details',detail
    ) order by test_id),'{}'::jsonb) as verification_summary
  from pg_temp.v008_results
)
-- MUST REMAIN THE LAST STATEMENT: one row, with every test preserved in JSON.
select t.overall_status,t.passed,t.failed,t.manual_checks,
       a.area_summary,t.verification_summary
from totals t cross join area_output a;
