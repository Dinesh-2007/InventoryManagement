-- =============================================================================
-- StockSense — inventory core
-- Authoritative on-hand balances (inventory_balances), the append-only stock
-- movement journal (stock_ledger), a generic activity log
-- (operation_activity_logs), and the private.adjust_balance() helper that
-- every stock-changing RPC in 20260926000300_stock_functions.sql uses to
-- mutate balances safely under a row lock.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- inventory_balances — one row per (product, location). Authoritative source
-- of "how much of this product is at this location right now".
-- -----------------------------------------------------------------------------
create table public.inventory_balances (
  product_id        uuid not null references public.products (id) on delete restrict,
  location_id       uuid not null references public.locations (id) on delete restrict,
  quantity_on_hand  numeric(14, 3) not null default 0 check (quantity_on_hand >= 0),
  updated_at        timestamptz not null default now(),
  primary key (product_id, location_id)
);
create index inventory_balances_product_idx on public.inventory_balances (product_id);
create index inventory_balances_location_idx on public.inventory_balances (location_id);

-- -----------------------------------------------------------------------------
-- stock_ledger — append-only journal of every stock movement. Never updated
-- or deleted after insert; RLS (see 20260926000400_rls.sql) grants no
-- write policies at all, and the trigger below is a second line of defense
-- against any future permissive UPDATE/DELETE grant.
-- -----------------------------------------------------------------------------
create table public.stock_ledger (
  id                uuid primary key default gen_random_uuid(),
  product_id        uuid not null references public.products (id) on delete restrict,
  warehouse_id      uuid not null references public.warehouses (id) on delete restrict,
  location_id       uuid not null references public.locations (id) on delete restrict,
  movement_type     public.movement_type not null,
  -- Signed per convention: RECEIPT/found ADJUSTMENT > 0, DELIVERY/consumed
  -- ADJUSTMENT < 0, TRANSFER stored positive (representing the moved amount,
  -- from from_location_id to to_location_id).
  quantity          numeric(14, 3) not null,
  reference_type    text,
  reference_id      uuid,
  from_location_id  uuid references public.locations (id) on delete restrict,
  to_location_id    uuid references public.locations (id) on delete restrict,
  unit_cost         numeric(14, 2),
  reason            public.adjustment_reason,
  performed_by      uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now()
);
create index stock_ledger_product_idx on public.stock_ledger (product_id);
create index stock_ledger_warehouse_idx on public.stock_ledger (warehouse_id);
create index stock_ledger_location_idx on public.stock_ledger (location_id);
create index stock_ledger_reference_idx on public.stock_ledger (reference_type, reference_id);
create index stock_ledger_created_at_idx on public.stock_ledger (created_at desc);

create or replace function private.block_ledger_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'stock_ledger is append-only; % is not permitted.', tg_op
    using errcode = 'P0001', hint = 'stocksense';
end;
$$;
create trigger stock_ledger_no_update before update on public.stock_ledger
  for each row execute function private.block_ledger_mutation();
create trigger stock_ledger_no_delete before delete on public.stock_ledger
  for each row execute function private.block_ledger_mutation();

-- -----------------------------------------------------------------------------
-- operation_activity_logs — free-form activity trail for any entity
-- (receipt, delivery, internal_transfer, stock_adjustment, ...).
-- -----------------------------------------------------------------------------
create table public.operation_activity_logs (
  id            uuid primary key default gen_random_uuid(),
  entity_type   text not null,
  entity_id     uuid not null,
  action        text not null,
  performed_by  uuid references public.profiles (id) on delete set null,
  note          text check (note is null or char_length(note) <= 1000),
  created_at    timestamptz not null default now()
);
create index operation_activity_logs_entity_idx on public.operation_activity_logs (entity_type, entity_id);

-- -----------------------------------------------------------------------------
-- private.lock_and_get_balance — upsert-then-lock a balance row and return
-- its current quantity. Callers hold the row lock for the remainder of their
-- transaction, so a concurrent adjust_balance() on the same (product,
-- location) blocks until this transaction commits or rolls back.
-- -----------------------------------------------------------------------------
create or replace function private.lock_and_get_balance(p_product uuid, p_location uuid)
returns numeric
language plpgsql
set search_path = ''
as $$
declare
  v_qty numeric(14, 3);
begin
  insert into public.inventory_balances (product_id, location_id, quantity_on_hand)
  values (p_product, p_location, 0)
  on conflict (product_id, location_id) do nothing;

  select quantity_on_hand into v_qty
  from public.inventory_balances
  where product_id = p_product and location_id = p_location
  for update;

  return v_qty;
end;
$$;

-- -----------------------------------------------------------------------------
-- private.adjust_balance — the ONLY sanctioned way to change a balance.
-- Locks the row first (via lock_and_get_balance), computes the new quantity,
-- and either applies it or raises a friendly, stocksense-hinted error if it
-- would go negative. Never relies on the CHECK constraint alone: the
-- friendly message needs the product name/uom, which the constraint can't
-- produce.
-- -----------------------------------------------------------------------------
create or replace function private.adjust_balance(p_product uuid, p_location uuid, p_delta numeric)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_current numeric(14, 3);
  v_new     numeric(14, 3);
  v_name    text;
  v_uom     text;
begin
  v_current := private.lock_and_get_balance(p_product, p_location);
  v_new := v_current + p_delta;

  if v_new < 0 then
    select name, unit_of_measure into v_name, v_uom
    from public.products
    where id = p_product;

    raise exception 'Insufficient available stock for %. Available: % %. Requested: % %.',
      coalesce(v_name, 'this product'),
      v_current,
      coalesce(v_uom, 'unit(s)'),
      abs(p_delta),
      coalesce(v_uom, 'unit(s)')
      using errcode = 'P0001', hint = 'stocksense';
  end if;

  update public.inventory_balances
  set quantity_on_hand = v_new, updated_at = private.app_now()
  where product_id = p_product and location_id = p_location;
end;
$$;
