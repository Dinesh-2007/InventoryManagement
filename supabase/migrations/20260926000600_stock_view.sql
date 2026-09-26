-- =============================================================================
-- StockSense — stock overview views
-- Derived, read-only views over inventory_balances/products (and, per
-- location, warehouses/locations) used by the Products and Stock pages.
-- security_invoker so RLS on the underlying tables applies to the querying
-- user rather than the view owner (Postgres 15+, project is PG17).
-- =============================================================================

create or replace view public.stock_overview as
select
  p.id as product_id,
  p.name,
  p.sku,
  p.category_id,
  p.unit_of_measure,
  p.per_unit_cost,
  p.reorder_point,
  p.reorder_quantity,
  p.active,
  coalesce(sum(ib.quantity_on_hand), 0) as on_hand,
  coalesce(sum(ib.quantity_on_hand), 0) - coalesce((
    select sum(di.quantity)
    from public.delivery_items di
    join public.deliveries d on d.id = di.delivery_id
    where di.product_id = p.id
      and d.status in ('waiting', 'ready')
  ), 0) as free_to_use
from public.products p
left join public.inventory_balances ib on ib.product_id = p.id
group by p.id;

alter view public.stock_overview set (security_invoker = true);
grant select on public.stock_overview to authenticated;

create or replace view public.stock_by_location as
select
  ib.product_id,
  ib.location_id,
  l.name as location_name,
  w.name as warehouse_name,
  ib.quantity_on_hand
from public.inventory_balances ib
join public.products p on p.id = ib.product_id
join public.locations l on l.id = ib.location_id
join public.warehouses w on w.id = l.warehouse_id;

alter view public.stock_by_location set (security_invoker = true);
grant select on public.stock_by_location to authenticated;
