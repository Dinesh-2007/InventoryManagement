-- =============================================================================
-- StockSense — stock RPC functions
-- Every function here is SECURITY DEFINER with search_path = '' (owner-only
-- access to private.*, no injectable search_path). Each call is a single
-- plpgsql function body, so Postgres runs it as one implicit transaction:
-- any raised exception rolls back everything the function did, including
-- balance updates and ledger inserts already performed earlier in the call.
-- We never catch exceptions here, so that atomicity is never short-circuited.
--
-- Permissions: creating/completing receipts, deliveries, transfers and
-- adjustments is open to any authenticated profile (both roles) per
-- AGENT_CONTEXT.md §6 — enforced via private.require_user(). Master-data
-- writes (products, categories, warehouses, locations, suppliers,
-- customers) are manager-only, but that is enforced entirely by RLS in
-- 20260926000400_rls.sql, not by RPCs (there are none for master data).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Delivery availability helpers
-- -----------------------------------------------------------------------------

-- "Free to use" check for one delivery: on-hand at its location minus the
-- sum of quantity reserved by every OTHER active (ready/waiting) delivery
-- from that same location, per product. Returns true iff every line of the
-- delivery is covered.
create or replace function private.delivery_is_coverable(p_delivery_id uuid)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_location  uuid;
  v_onhand    numeric(14, 3);
  v_reserved  numeric(14, 3);
  v_available numeric(14, 3);
  r record;
begin
  select location_id into v_location from public.deliveries where id = p_delivery_id;

  for r in
    select product_id, quantity from public.delivery_items where delivery_id = p_delivery_id
  loop
    select coalesce(ib.quantity_on_hand, 0) into v_onhand
    from public.inventory_balances ib
    where ib.product_id = r.product_id and ib.location_id = v_location;

    select coalesce(sum(di.quantity), 0) into v_reserved
    from public.delivery_items di
    join public.deliveries d on d.id = di.delivery_id
    where di.product_id = r.product_id
      and d.location_id = v_location
      and d.status in ('ready', 'waiting')
      and d.id <> p_delivery_id;

    v_available := coalesce(v_onhand, 0) - v_reserved;
    if v_available < r.quantity then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

-- Internal (non-auth-checked) recompute of a single waiting delivery. Used
-- both by the public RPC (after a require_user() check) and by the bulk
-- location scan below (already running inside an authorized RPC call).
create or replace function private.recompute_delivery_readiness_internal(p_delivery_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_status public.operation_status;
begin
  select status into v_status from public.deliveries where id = p_delivery_id for update;

  if v_status = 'waiting' and private.delivery_is_coverable(p_delivery_id) then
    update public.deliveries set status = 'ready' where id = p_delivery_id;

    insert into public.operation_activity_logs (entity_type, entity_id, action, performed_by, note)
    values ('delivery', p_delivery_id, 'delivery.ready', null, 'Auto-promoted from waiting to ready.');
  end if;
end;
$$;

-- Bounded scan of waiting deliveries at a location, called automatically
-- after complete_receipt / complete_transfer / apply_adjustment increases
-- stock there.
create or replace function private.recompute_deliveries_at_location(p_location_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  r record;
begin
  for r in
    select id from public.deliveries
    where location_id = p_location_id and status = 'waiting'
    order by scheduled_date asc
    limit 200
  loop
    perform private.recompute_delivery_readiness_internal(r.id);
  end loop;
end;
$$;

-- Public, manually-callable recompute for a single delivery.
create or replace function public.recompute_delivery_readiness(p_delivery_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_user();
  perform private.recompute_delivery_readiness_internal(p_delivery_id);
end;
$$;

-- -----------------------------------------------------------------------------
-- Receipts
-- -----------------------------------------------------------------------------

create or replace function public.confirm_receipt(p_receipt_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := private.require_user();
  v_status public.operation_status;
begin
  select status into v_status from public.receipts where id = p_receipt_id for update;
  if not found then
    raise exception 'Receipt not found.' using errcode = 'P0001', hint = 'stocksense';
  end if;
  if v_status <> 'draft' then
    raise exception 'This operation cannot be completed from the current status.'
      using errcode = 'P0001', hint = 'stocksense';
  end if;

  update public.receipts set status = 'ready', confirmed_at = private.app_now() where id = p_receipt_id;

  insert into public.operation_activity_logs (entity_type, entity_id, action, performed_by, note)
  values ('receipt', p_receipt_id, 'receipt.confirmed', v_uid, null);
end;
$$;

create or replace function public.complete_receipt(p_receipt_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := private.require_user();
  v_status    public.operation_status;
  v_location  uuid;
  v_warehouse uuid;
  r record;
begin
  select status, location_id, warehouse_id into v_status, v_location, v_warehouse
  from public.receipts where id = p_receipt_id for update;

  if not found then
    raise exception 'Receipt not found.' using errcode = 'P0001', hint = 'stocksense';
  end if;
  if v_status <> 'ready' then
    raise exception 'This operation cannot be completed from the current status.'
      using errcode = 'P0001', hint = 'stocksense';
  end if;

  for r in select product_id, quantity, unit_cost from public.receipt_items where receipt_id = p_receipt_id loop
    perform private.adjust_balance(r.product_id, v_location, r.quantity);

    insert into public.stock_ledger (
      product_id, warehouse_id, location_id, movement_type, quantity,
      reference_type, reference_id, to_location_id, unit_cost, performed_by
    ) values (
      r.product_id, v_warehouse, v_location, 'RECEIPT', r.quantity,
      'receipt', p_receipt_id, v_location, r.unit_cost, v_uid
    );
  end loop;

  update public.receipts set status = 'done', done_at = private.app_now() where id = p_receipt_id;

  insert into public.operation_activity_logs (entity_type, entity_id, action, performed_by, note)
  values ('receipt', p_receipt_id, 'receipt.completed', v_uid, null);

  perform private.recompute_deliveries_at_location(v_location);
end;
$$;

create or replace function public.cancel_receipt(p_receipt_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := private.require_user();
  v_status public.operation_status;
begin
  select status into v_status from public.receipts where id = p_receipt_id for update;
  if not found then
    raise exception 'Receipt not found.' using errcode = 'P0001', hint = 'stocksense';
  end if;
  if v_status = 'done' then
    raise exception 'Completed receipts cannot be canceled. A stock reversal flow is not implemented yet — create a stock adjustment instead.'
      using errcode = 'P0001', hint = 'stocksense';
  end if;
  if v_status not in ('draft', 'ready') then
    raise exception 'This operation cannot be completed from the current status.'
      using errcode = 'P0001', hint = 'stocksense';
  end if;

  update public.receipts set status = 'canceled', canceled_at = private.app_now() where id = p_receipt_id;

  insert into public.operation_activity_logs (entity_type, entity_id, action, performed_by, note)
  values ('receipt', p_receipt_id, 'receipt.canceled', v_uid, null);
end;
$$;

-- -----------------------------------------------------------------------------
-- Deliveries
-- -----------------------------------------------------------------------------

create or replace function public.confirm_delivery(p_delivery_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := private.require_user();
  v_status  public.operation_status;
  v_covered boolean;
begin
  select status into v_status from public.deliveries where id = p_delivery_id for update;
  if not found then
    raise exception 'Delivery not found.' using errcode = 'P0001', hint = 'stocksense';
  end if;
  if v_status <> 'draft' then
    raise exception 'This operation cannot be completed from the current status.'
      using errcode = 'P0001', hint = 'stocksense';
  end if;

  v_covered := private.delivery_is_coverable(p_delivery_id);

  if v_covered then
    update public.deliveries set status = 'ready', confirmed_at = private.app_now() where id = p_delivery_id;
  else
    update public.deliveries set status = 'waiting', confirmed_at = private.app_now() where id = p_delivery_id;
  end if;

  insert into public.operation_activity_logs (entity_type, entity_id, action, performed_by, note)
  values (
    'delivery', p_delivery_id, 'delivery.confirmed', v_uid,
    case when v_covered then 'Confirmed as ready.' else 'Confirmed as waiting (insufficient free stock).' end
  );
end;
$$;

create or replace function public.complete_delivery(p_delivery_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := private.require_user();
  v_status    public.operation_status;
  v_location  uuid;
  v_warehouse uuid;
  r record;
begin
  select status, location_id, warehouse_id into v_status, v_location, v_warehouse
  from public.deliveries where id = p_delivery_id for update;

  if not found then
    raise exception 'Delivery not found.' using errcode = 'P0001', hint = 'stocksense';
  end if;
  if v_status <> 'ready' then
    raise exception 'This operation cannot be completed from the current status.'
      using errcode = 'P0001', hint = 'stocksense';
  end if;

  -- Re-check availability under lock (race protection): adjust_balance()
  -- raises the friendly "Insufficient available stock" error itself if
  -- stock disappeared between confirm and complete.
  for r in select product_id, quantity from public.delivery_items where delivery_id = p_delivery_id loop
    perform private.adjust_balance(r.product_id, v_location, -r.quantity);

    insert into public.stock_ledger (
      product_id, warehouse_id, location_id, movement_type, quantity,
      reference_type, reference_id, from_location_id, performed_by
    ) values (
      r.product_id, v_warehouse, v_location, 'DELIVERY', -r.quantity,
      'delivery', p_delivery_id, v_location, v_uid
    );
  end loop;

  update public.deliveries set status = 'done', done_at = private.app_now() where id = p_delivery_id;

  insert into public.operation_activity_logs (entity_type, entity_id, action, performed_by, note)
  values ('delivery', p_delivery_id, 'delivery.completed', v_uid, null);
end;
$$;

create or replace function public.cancel_delivery(p_delivery_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := private.require_user();
  v_status public.operation_status;
begin
  select status into v_status from public.deliveries where id = p_delivery_id for update;
  if not found then
    raise exception 'Delivery not found.' using errcode = 'P0001', hint = 'stocksense';
  end if;
  if v_status not in ('draft', 'waiting', 'ready') then
    raise exception 'This operation cannot be completed from the current status.'
      using errcode = 'P0001', hint = 'stocksense';
  end if;

  update public.deliveries set status = 'canceled', canceled_at = private.app_now() where id = p_delivery_id;

  insert into public.operation_activity_logs (entity_type, entity_id, action, performed_by, note)
  values ('delivery', p_delivery_id, 'delivery.canceled', v_uid, null);
end;
$$;

-- -----------------------------------------------------------------------------
-- Internal transfers
-- -----------------------------------------------------------------------------

create or replace function public.confirm_transfer(p_transfer_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := private.require_user();
  v_status public.operation_status;
begin
  select status into v_status from public.internal_transfers where id = p_transfer_id for update;
  if not found then
    raise exception 'Internal transfer not found.' using errcode = 'P0001', hint = 'stocksense';
  end if;
  if v_status <> 'draft' then
    raise exception 'This operation cannot be completed from the current status.'
      using errcode = 'P0001', hint = 'stocksense';
  end if;

  update public.internal_transfers set status = 'ready', confirmed_at = private.app_now() where id = p_transfer_id;

  insert into public.operation_activity_logs (entity_type, entity_id, action, performed_by, note)
  values ('internal_transfer', p_transfer_id, 'transfer.confirmed', v_uid, null);
end;
$$;

create or replace function public.complete_transfer(p_transfer_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := private.require_user();
  v_status   public.operation_status;
  v_src_loc  uuid;
  v_src_wh   uuid;
  v_dst_loc  uuid;
  v_dst_wh   uuid;
  r record;
begin
  select status, source_location_id, source_warehouse_id, dest_location_id, dest_warehouse_id
    into v_status, v_src_loc, v_src_wh, v_dst_loc, v_dst_wh
  from public.internal_transfers where id = p_transfer_id for update;

  if not found then
    raise exception 'Internal transfer not found.' using errcode = 'P0001', hint = 'stocksense';
  end if;
  if v_status <> 'ready' then
    raise exception 'This operation cannot be completed from the current status.'
      using errcode = 'P0001', hint = 'stocksense';
  end if;

  for r in select product_id, quantity from public.internal_transfer_items where transfer_id = p_transfer_id loop
    perform private.adjust_balance(r.product_id, v_src_loc, -r.quantity);
    perform private.adjust_balance(r.product_id, v_dst_loc, r.quantity);

    insert into public.stock_ledger (
      product_id, warehouse_id, location_id, movement_type, quantity,
      reference_type, reference_id, from_location_id, to_location_id, performed_by
    ) values (
      r.product_id, v_dst_wh, v_dst_loc, 'TRANSFER', r.quantity,
      'transfer', p_transfer_id, v_src_loc, v_dst_loc, v_uid
    );
  end loop;

  update public.internal_transfers set status = 'done', done_at = private.app_now() where id = p_transfer_id;

  insert into public.operation_activity_logs (entity_type, entity_id, action, performed_by, note)
  values ('internal_transfer', p_transfer_id, 'transfer.completed', v_uid, null);

  perform private.recompute_deliveries_at_location(v_dst_loc);
end;
$$;

create or replace function public.cancel_transfer(p_transfer_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := private.require_user();
  v_status public.operation_status;
begin
  select status into v_status from public.internal_transfers where id = p_transfer_id for update;
  if not found then
    raise exception 'Internal transfer not found.' using errcode = 'P0001', hint = 'stocksense';
  end if;
  if v_status not in ('draft', 'ready') then
    raise exception 'This operation cannot be completed from the current status.'
      using errcode = 'P0001', hint = 'stocksense';
  end if;

  update public.internal_transfers set status = 'canceled', canceled_at = private.app_now() where id = p_transfer_id;

  insert into public.operation_activity_logs (entity_type, entity_id, action, performed_by, note)
  values ('internal_transfer', p_transfer_id, 'transfer.canceled', v_uid, null);
end;
$$;

-- -----------------------------------------------------------------------------
-- Stock adjustments
-- -----------------------------------------------------------------------------

create or replace function public.apply_adjustment(p_adjustment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid           uuid := private.require_user();
  v_status        public.operation_status;
  v_location      uuid;
  v_warehouse     uuid;
  v_reason        public.adjustment_reason;
  v_any_increase  boolean := false;
  v_system        numeric(14, 3);
  v_diff          numeric(14, 3);
  r record;
begin
  select status, location_id, warehouse_id, reason
    into v_status, v_location, v_warehouse, v_reason
  from public.stock_adjustments where id = p_adjustment_id for update;

  if not found then
    raise exception 'Stock adjustment not found.' using errcode = 'P0001', hint = 'stocksense';
  end if;
  if v_status <> 'draft' then
    raise exception 'This operation cannot be completed from the current status.'
      using errcode = 'P0001', hint = 'stocksense';
  end if;

  for r in
    select id, product_id, counted_quantity from public.stock_adjustment_items where adjustment_id = p_adjustment_id
  loop
    v_system := private.lock_and_get_balance(r.product_id, v_location);
    v_diff := r.counted_quantity - v_system;

    update public.stock_adjustment_items
    set system_quantity = v_system, difference = v_diff
    where id = r.id;

    if v_diff <> 0 then
      perform private.adjust_balance(r.product_id, v_location, v_diff);

      insert into public.stock_ledger (
        product_id, warehouse_id, location_id, movement_type, quantity,
        reference_type, reference_id, reason, performed_by
      ) values (
        r.product_id, v_warehouse, v_location, 'ADJUSTMENT', v_diff,
        'stock_adjustment', p_adjustment_id, v_reason, v_uid
      );

      if v_diff > 0 then
        v_any_increase := true;
      end if;
    end if;
  end loop;

  update public.stock_adjustments set status = 'done', done_at = private.app_now() where id = p_adjustment_id;

  insert into public.operation_activity_logs (entity_type, entity_id, action, performed_by, note)
  values ('stock_adjustment', p_adjustment_id, 'adjustment.applied', v_uid, null);

  if v_any_increase then
    perform private.recompute_deliveries_at_location(v_location);
  end if;
end;
$$;

create or replace function public.cancel_adjustment(p_adjustment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := private.require_user();
  v_status public.operation_status;
begin
  select status into v_status from public.stock_adjustments where id = p_adjustment_id for update;
  if not found then
    raise exception 'Stock adjustment not found.' using errcode = 'P0001', hint = 'stocksense';
  end if;
  if v_status <> 'draft' then
    raise exception 'This operation cannot be completed from the current status.'
      using errcode = 'P0001', hint = 'stocksense';
  end if;

  update public.stock_adjustments set status = 'canceled', canceled_at = private.app_now() where id = p_adjustment_id;

  insert into public.operation_activity_logs (entity_type, entity_id, action, performed_by, note)
  values ('stock_adjustment', p_adjustment_id, 'adjustment.canceled', v_uid, null);
end;
$$;

-- -----------------------------------------------------------------------------
-- Signup helper (pre-auth, needs anon access)
-- -----------------------------------------------------------------------------

create or replace function public.is_login_id_available(p_login_id text)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select not exists (select 1 from public.profiles where lower(login_id) = lower(p_login_id))
$$;

-- -----------------------------------------------------------------------------
-- Grants — authenticated only, except is_login_id_available (also anon,
-- needed before a session exists). Postgres grants EXECUTE to PUBLIC by
-- default on every new function, so we must revoke that first.
-- -----------------------------------------------------------------------------

revoke all on function public.recompute_delivery_readiness(uuid) from public;
revoke all on function public.confirm_receipt(uuid) from public;
revoke all on function public.complete_receipt(uuid) from public;
revoke all on function public.cancel_receipt(uuid) from public;
revoke all on function public.confirm_delivery(uuid) from public;
revoke all on function public.complete_delivery(uuid) from public;
revoke all on function public.cancel_delivery(uuid) from public;
revoke all on function public.confirm_transfer(uuid) from public;
revoke all on function public.complete_transfer(uuid) from public;
revoke all on function public.cancel_transfer(uuid) from public;
revoke all on function public.apply_adjustment(uuid) from public;
revoke all on function public.cancel_adjustment(uuid) from public;
revoke all on function public.is_login_id_available(text) from public;

grant execute on function public.recompute_delivery_readiness(uuid) to authenticated;
grant execute on function public.confirm_receipt(uuid) to authenticated;
grant execute on function public.complete_receipt(uuid) to authenticated;
grant execute on function public.cancel_receipt(uuid) to authenticated;
grant execute on function public.confirm_delivery(uuid) to authenticated;
grant execute on function public.complete_delivery(uuid) to authenticated;
grant execute on function public.cancel_delivery(uuid) to authenticated;
grant execute on function public.confirm_transfer(uuid) to authenticated;
grant execute on function public.complete_transfer(uuid) to authenticated;
grant execute on function public.cancel_transfer(uuid) to authenticated;
grant execute on function public.apply_adjustment(uuid) to authenticated;
grant execute on function public.cancel_adjustment(uuid) to authenticated;
grant execute on function public.is_login_id_available(text) to authenticated, anon;
