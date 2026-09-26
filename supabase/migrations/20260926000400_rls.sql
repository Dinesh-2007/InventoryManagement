-- =============================================================================
-- StockSense — row level security
-- Enables RLS on every business table and grants the minimum table-level
-- privileges + policies each role needs. `anon` gets nothing on any business
-- table (it can only reach public.is_login_id_available, granted directly in
-- 20260926000300_stock_functions.sql). All writes to inventory_balances,
-- stock_ledger and operation_activity_logs happen exclusively through the
-- SECURITY DEFINER functions (which run as the table owner and therefore
-- bypass RLS), so those three tables get SELECT-only policies.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Shared triggers used below
-- -----------------------------------------------------------------------------

-- Defaults created_by to the calling user on insert, for the four operation
-- document tables. Clients cannot forge created_by for someone else this way
-- since the column is only ever filled in when null.
create or replace function private.set_created_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['receipts', 'deliveries', 'internal_transfers', 'stock_adjustments'] loop
    execute format(
      'create trigger %1$s_set_created_by before insert on public.%1$I for each row execute function private.set_created_by()',
      t
    );
  end loop;
end;
$$;

-- Profiles: role/login_id/email can never be changed through a direct table
-- update, by anyone, regardless of RLS — mirrors the products_normalize
-- pattern already used for initial_stock/created_by in the core schema.
create or replace function private.protect_profile_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.role := old.role;
  new.login_id := old.login_id;
  new.email := old.email;
  return new;
end;
$$;
create trigger profiles_protect_fields before update on public.profiles
  for each row execute function private.protect_profile_fields();

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
revoke all on public.profiles from anon;
grant select, update on public.profiles to authenticated;

create policy profiles_select on public.profiles
  for select to authenticated
  using (true);

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- -----------------------------------------------------------------------------
-- Master data: product_categories, products, warehouses, locations,
-- suppliers, customers — read for everyone signed in, writes manager-only.
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'product_categories', 'products', 'warehouses', 'locations', 'suppliers', 'customers'
  ] loop
    execute format('alter table public.%1$I enable row level security', t);
    execute format('revoke all on public.%1$I from anon', t);
    execute format('grant select, insert, update, delete on public.%1$I to authenticated', t);

    execute format(
      'create policy %1$s_select on public.%1$I for select to authenticated using (true)', t
    );
    execute format(
      'create policy %1$s_insert on public.%1$I for insert to authenticated with check (public.is_manager())', t
    );
    execute format(
      'create policy %1$s_update on public.%1$I for update to authenticated using (public.is_manager()) with check (public.is_manager())', t
    );
    execute format(
      'create policy %1$s_delete on public.%1$I for delete to authenticated using (public.is_manager())', t
    );
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Operation documents: receipts, deliveries, internal_transfers,
-- stock_adjustments — read for everyone signed in, create/edit-while-draft
-- for any authenticated profile. The status column can only move via the
-- SECURITY DEFINER RPCs (which run as the table owner and bypass RLS): the
-- UPDATE policy below requires the row to be, and remain, 'draft', so no
-- direct table UPDATE can ever change status. No DELETE policy: documents
-- are canceled, never removed.
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['receipts', 'deliveries', 'internal_transfers', 'stock_adjustments'] loop
    execute format('alter table public.%1$I enable row level security', t);
    execute format('revoke all on public.%1$I from anon', t);
    execute format('grant select, insert, update on public.%1$I to authenticated', t);

    execute format(
      'create policy %1$s_select on public.%1$I for select to authenticated using (true)', t
    );
    execute format(
      'create policy %1$s_insert on public.%1$I for insert to authenticated with check (true)', t
    );
    execute format(
      'create policy %1$s_update_draft on public.%1$I for update to authenticated using (status = ''draft''::public.operation_status) with check (status = ''draft''::public.operation_status)', t
    );
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Operation document line items: only insertable/editable/removable while
-- the parent document is still 'draft'.
-- -----------------------------------------------------------------------------
do $$
declare
  child  text;
  parent text;
  fk     text;
begin
  foreach child in array array['receipt_items', 'delivery_items', 'internal_transfer_items', 'stock_adjustment_items'] loop
    parent := case child
      when 'receipt_items' then 'receipts'
      when 'delivery_items' then 'deliveries'
      when 'internal_transfer_items' then 'internal_transfers'
      when 'stock_adjustment_items' then 'stock_adjustments'
    end;
    fk := case child
      when 'receipt_items' then 'receipt_id'
      when 'delivery_items' then 'delivery_id'
      when 'internal_transfer_items' then 'transfer_id'
      when 'stock_adjustment_items' then 'adjustment_id'
    end;

    execute format('alter table public.%1$I enable row level security', child);
    execute format('revoke all on public.%1$I from anon', child);
    execute format('grant select, insert, update, delete on public.%1$I to authenticated', child);

    execute format(
      'create policy %1$s_select on public.%1$I for select to authenticated using (true)', child
    );
    execute format(
      'create policy %1$s_insert on public.%1$I for insert to authenticated with check (exists (select 1 from public.%2$I p where p.id = %3$I and p.status = ''draft''::public.operation_status))',
      child, parent, fk
    );
    execute format(
      'create policy %1$s_update on public.%1$I for update to authenticated using (exists (select 1 from public.%2$I p where p.id = %3$I and p.status = ''draft''::public.operation_status)) with check (exists (select 1 from public.%2$I p where p.id = %3$I and p.status = ''draft''::public.operation_status))',
      child, parent, fk
    );
    execute format(
      'create policy %1$s_delete on public.%1$I for delete to authenticated using (exists (select 1 from public.%2$I p where p.id = %3$I and p.status = ''draft''::public.operation_status))',
      child, parent, fk
    );
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- inventory_balances / stock_ledger / operation_activity_logs — read-only to
-- clients; every write happens inside the owner-run RPC functions.
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['inventory_balances', 'stock_ledger', 'operation_activity_logs'] loop
    execute format('alter table public.%1$I enable row level security', t);
    execute format('revoke all on public.%1$I from anon', t);
    execute format('grant select on public.%1$I to authenticated', t);
    execute format(
      'create policy %1$s_select on public.%1$I for select to authenticated using (true)', t
    );
  end loop;
end;
$$;
