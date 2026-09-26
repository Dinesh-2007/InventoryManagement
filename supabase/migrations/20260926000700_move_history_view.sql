-- =============================================================================
-- StockSense — move history view
-- Pre-joined, read-only view over stock_ledger for the Move History page.
-- security_invoker so RLS on the underlying tables applies to the querying
-- user rather than the view owner.
--
-- ASSUMPTION (frontend agent, no access to the DB agent's stock_ledger DDL at
-- authoring time): stock_ledger(id uuid, created_at timestamptz,
-- reference_type text check in ('receipt','delivery','transfer','stock_adjustment'),
-- reference_id uuid, product_id uuid, warehouse_id uuid, from_location_id uuid
-- nullable, to_location_id uuid nullable, quantity numeric). If the DB agent's
-- actual column names differ, this migration will fail to apply — update the
-- column list below to match and re-run `supabase db push`.
-- =============================================================================

create or replace view public.move_history_view as
select
  sl.id,
  sl.created_at,
  sl.reference_type,
  sl.reference_id,
  sl.product_id,
  p.name as product_name,
  p.sku as product_sku,
  sl.warehouse_id,
  w.name as warehouse_name,
  sl.from_location_id,
  fl.name as from_location_name,
  sl.to_location_id,
  tl.name as to_location_name,
  sl.quantity,
  case sl.reference_type
    when 'receipt' then (select r.reference from public.receipts r where r.id = sl.reference_id)
    when 'delivery' then (select d.reference from public.deliveries d where d.id = sl.reference_id)
    when 'transfer' then (select t.reference from public.internal_transfers t where t.id = sl.reference_id)
    when 'stock_adjustment' then (select a.reference from public.stock_adjustments a where a.id = sl.reference_id)
  end as reference,
  case sl.reference_type
    when 'receipt' then (select r.status::text from public.receipts r where r.id = sl.reference_id)
    when 'delivery' then (select d.status::text from public.deliveries d where d.id = sl.reference_id)
    when 'transfer' then (select t.status::text from public.internal_transfers t where t.id = sl.reference_id)
    when 'stock_adjustment' then (select a.status::text from public.stock_adjustments a where a.id = sl.reference_id)
  end as status,
  case sl.reference_type
    when 'receipt' then (select s.name from public.receipts r join public.suppliers s on s.id = r.supplier_id where r.id = sl.reference_id)
    when 'delivery' then (select c.name from public.deliveries d join public.customers c on c.id = d.customer_id where d.id = sl.reference_id)
  end as contact_name
from public.stock_ledger sl
join public.products p on p.id = sl.product_id
left join public.warehouses w on w.id = sl.warehouse_id
left join public.locations fl on fl.id = sl.from_location_id
left join public.locations tl on tl.id = sl.to_location_id;

alter view public.move_history_view set (security_invoker = true);
grant select on public.move_history_view to authenticated;
