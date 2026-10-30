-- MANUAL, DESTRUCTIVE — not applied automatically and not part of the migration run.
--
-- These nine tables are not referenced anywhere in the application source, and
-- migration 003 has already restricted them to administrators. Dropping them
-- removes their data permanently, so run this only after confirming the rows
-- hold nothing you need (historical orders/coupons are the realistic risk):
--
--   select 'ads' t, count(*) from public.ads union all
--   select 'orders', count(*) from public.orders union all
--   select 'order_items', count(*) from public.order_items union all
--   select 'coupons', count(*) from public.coupons union all
--   select 'products', count(*) from public.products union all
--   select 'product_variants', count(*) from public.product_variants union all
--   select 'product_images', count(*) from public.product_images union all
--   select 'categories', count(*) from public.categories union all
--   select 'content_items', count(*) from public.content_items;
--
-- Take a Supabase backup first, then run:

begin;
drop table if exists
  public.ads, public.categories, public.products, public.product_images,
  public.product_variants, public.coupons, public.orders, public.order_items,
  public.content_items
restrict;

select count(*) as remaining_legacy_tables
from information_schema.tables
where table_schema = 'public'
  and table_name in ('ads','categories','products','product_images',
                     'product_variants','coupons','orders','order_items','content_items');
commit;
