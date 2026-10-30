-- 003 — SECURITY DEFINER search_path pinning + legacy table containment
-- Audit findings H-5 (CWE-426 function resolution) and M-7 (USING(true) tables).
-- Idempotent.

begin;

-- ── Pin search_path on every SECURITY DEFINER function in public ─────────────
-- Done as a loop so it also covers functions added later in this migration and
-- any that were missed by the original reviewed script.
do $$
declare
  fn record;
begin
  for fn in
    select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
  loop
    execute format(
      'alter function %I.%I(%s) set search_path = public, pg_temp',
      fn.nspname, fn.proname, fn.args
    );
  end loop;
end $$;

-- ── Legacy commerce/catalog tables ───────────────────────────────────────────
-- These tables are not referenced anywhere in the application source. They are
-- locked to administrators instead of dropped, because a DROP is irreversible
-- and their contents cannot be inspected from the repository. The opt-in DROP
-- script lives in supabase/manual/drop_legacy_tables.sql.
do $$
declare
  tbl text;
  pol record;
begin
  foreach tbl in array array[
    'ads', 'categories', 'products', 'product_images', 'product_variants',
    'coupons', 'orders', 'order_items', 'content_items'
  ] loop
    if exists (select 1 from pg_tables where schemaname = 'public' and tablename = tbl) then
      execute format('alter table public.%I enable row level security', tbl);
      execute format('revoke all on public.%I from anon', tbl);

      for pol in
        select policyname from pg_policies where schemaname = 'public' and tablename = tbl
      loop
        execute format('drop policy %I on public.%I', pol.policyname, tbl);
      end loop;

      execute format(
        'create policy %I on public.%I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))',
        tbl || '_admin_only', tbl
      );
    end if;
  end loop;
end $$;

commit;
