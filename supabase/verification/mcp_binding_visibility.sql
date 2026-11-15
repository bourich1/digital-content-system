-- Isolated regression for the hook's data-modifying CTE. No auth/user data.
begin;
create temporary table mcp_binding_probe (id integer primary key, resource text);
do $$
declare actual text;
begin
  with recorded as (
    insert into mcp_binding_probe values (1, 'mcp')
    on conflict (id) do update set resource = excluded.resource
    returning *
  ), effective as (
    select * from recorded
    union all
    select * from mcp_binding_probe where false
  ) select resource into actual from effective where id = 1;
  if actual is distinct from 'mcp' then raise exception 'First exchange failed'; end if;

  with recorded as (
    insert into mcp_binding_probe values (1, 'other')
    on conflict (id) do update set resource = excluded.resource
    returning *
  ), effective as (
    select * from recorded
    union all
    select * from mcp_binding_probe where false
  ) select resource into actual from effective where id = 1;
  if actual is distinct from 'other' then raise exception 'Resource replacement failed'; end if;

  select resource into actual from mcp_binding_probe where id = 1;
  if actual is distinct from 'other' then raise exception 'Refresh persistence failed'; end if;
end;
$$;
select 'passed' as binding_visibility_regression;
rollback;
