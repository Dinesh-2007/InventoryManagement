-- =============================================================================
-- StockSense — core schema
-- Enums, profiles, master data (categories, products, warehouses, locations,
-- suppliers, customers) and operation documents (receipts, deliveries,
-- internal transfers, stock adjustments).
-- =============================================================================

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.app_role as enum ('inventory_manager', 'warehouse_staff');

-- One status vocabulary for every document type. Per-table CHECK constraints
-- restrict which values each document may use (e.g. receipts never "wait").
create type public.operation_status as enum ('draft', 'waiting', 'ready', 'done', 'canceled');

create type public.movement_type as enum ('RECEIPT', 'DELIVERY', 'TRANSFER', 'ADJUSTMENT');

create type public.adjustment_reason as enum (
  'initial_stock', 'physical_count', 'damaged', 'lost', 'found', 'data_correction', 'other'
);

create type public.delivery_operation_type as enum (
  'sales_order', 'sample', 'replacement', 'return_to_vendor', 'other'
);

-- -----------------------------------------------------------------------------
-- Shared helpers
-- -----------------------------------------------------------------------------

-- Clock used by every stock function. Seed scripts (running as a superuser
-- session, never through PostgREST) may pin it with `set app.now = ...` to
-- backdate demo history. API sessions (session_user = authenticator) always
-- get the real clock, so clients cannot forge timestamps.
create or replace function private.app_now()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select case
    when session_user::text <> 'authenticator'
         and nullif(current_setting('app.now', true), '') is not null
      then current_setting('app.now', true)::timestamptz
    else now()
  end
$$;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := private.app_now();
  return new;
end;
$$;

-- Formats document references: WH/IN/0001 … WH/IN/12345 (never truncates).
create or replace function private.format_reference(p_prefix text, p_number bigint)
returns text
language sql
immutable
set search_path = ''
as $$
  select p_prefix || lpad(p_number::text, greatest(4, length(p_number::text)), '0')
$$;

-- -----------------------------------------------------------------------------
-- Profiles
-- -----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '' check (char_length(full_name) <= 120),
  email       text not null,
  login_id    text check (login_id ~ '^[A-Za-z0-9._-]{3,32}$'),
  role        public.app_role not null default 'warehouse_staff',
  avatar_url  text check (avatar_url is null or avatar_url ~ '^https?://'),
  phone       text check (phone is null or char_length(phone) <= 30),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index profiles_login_id_key on public.profiles (lower(login_id)) where login_id is not null;
create index profiles_email_idx on public.profiles (lower(email));
create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

-- New auth users get a profile. The role is ALWAYS the least-privileged
-- default; user_metadata is client-controlled and must never grant a role.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_login text := nullif(btrim(new.raw_user_meta_data ->> 'login_id'), '');
begin
  if v_login is not null and v_login !~ '^[A-Za-z0-9._-]{3,32}$' then
    v_login := null;
  end if;
  if v_login is not null and exists (
    select 1 from public.profiles where lower(login_id) = lower(v_login)
  ) then
    raise exception 'Login ID "%" is already taken.', v_login using errcode = '23505';
  end if;

  insert into public.profiles (id, email, full_name, login_id)
  values (
    new.id,
    coalesce(new.email, ''),
    left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(coalesce(new.email, ''), '@', 1)), 120),
    v_login
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = coalesce(new.email, '') where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function private.sync_profile_email();

-- Role helpers (security definer so RLS policies can call them without recursion).
create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select role = 'inventory_manager' from public.profiles where id = auth.uid()),
    false
  )
$$;

create or replace function private.require_user()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'You must be signed in to perform this action.'
      using errcode = '28000', hint = 'stocksense';
  end if;
  return v_uid;
end;
$$;

create or replace function private.require_manager()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
begin
  if not public.is_manager() then
    raise exception 'Only inventory managers can perform this action.'
      using errcode = '42501', hint = 'stocksense';
  end if;
  return v_uid;
end;
$$;

-- -----------------------------------------------------------------------------
-- Master data
-- -----------------------------------------------------------------------------
create table public.product_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 1 and 80),
  description text check (description is null or char_length(description) <= 500),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index product_categories_name_key on public.product_categories (lower(name));
create trigger product_categories_updated_at before update on public.product_categories
  for each row execute function private.set_updated_at();

create table public.products (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(btrim(name)) between 1 and 120),
  sku               text not null check (sku ~ '^[A-Z0-9][A-Z0-9._/-]{0,39}$'),
  category_id       uuid not null references public.product_categories (id) on delete restrict,
  unit_of_measure   text not null check (char_length(btrim(unit_of_measure)) between 1 and 20),
  per_unit_cost     numeric(14, 2) not null default 0 check (per_unit_cost >= 0),
  -- Informational only: the quantity booked via an "initial_stock" adjustment
  -- at creation. Current stock always comes from inventory_balances.
  initial_stock     numeric(14, 3) not null default 0 check (initial_stock >= 0),
  reorder_point     numeric(14, 3) not null default 0 check (reorder_point >= 0),
  reorder_quantity  numeric(14, 3) not null default 0 check (reorder_quantity >= 0),
  description       text check (description is null or char_length(description) <= 1000),
  active            boolean not null default true,
  created_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create unique index products_sku_key on public.products (sku);
create index products_category_idx on public.products (category_id);
create index products_name_idx on public.products (lower(name));

create or replace function private.normalize_product()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.sku := upper(btrim(new.sku));
  new.name := btrim(new.name);
  new.unit_of_measure := btrim(new.unit_of_measure);
  if tg_op = 'UPDATE' then
    -- initial stock is booked once, at creation, through an adjustment.
    new.initial_stock := old.initial_stock;
    new.created_by := old.created_by;
  end if;
  return new;
end;
$$;
create trigger products_normalize before insert or update on public.products
  for each row execute function private.normalize_product();
create trigger products_updated_at before update on public.products
  for each row execute function private.set_updated_at();

create table public.warehouses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 1 and 80),
  short_code  text not null check (short_code ~ '^[A-Z0-9][A-Z0-9_-]{0,9}$'),
  address     text check (address is null or char_length(address) <= 300),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index warehouses_short_code_key on public.warehouses (short_code);

create table public.locations (
  id            uuid primary key default gen_random_uuid(),
  warehouse_id  uuid not null references public.warehouses (id) on delete restrict,
  name          text not null check (char_length(btrim(name)) between 1 and 80),
  short_code    text not null check (short_code ~ '^[A-Z0-9][A-Z0-9_-]{0,9}$'),
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- lets child tables enforce "this location belongs to that warehouse"
  unique (id, warehouse_id)
);
create unique index locations_wh_code_key on public.locations (warehouse_id, short_code);
create index locations_warehouse_idx on public.locations (warehouse_id);

create or replace function private.normalize_short_code()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.short_code := upper(btrim(new.short_code));
  new.name := btrim(new.name);
  return new;
end;
$$;
create trigger warehouses_normalize before insert or update on public.warehouses
  for each row execute function private.normalize_short_code();
create trigger locations_normalize before insert or update on public.locations
  for each row execute function private.normalize_short_code();
create trigger warehouses_updated_at before update on public.warehouses
  for each row execute function private.set_updated_at();
create trigger locations_updated_at before update on public.locations
  for each row execute function private.set_updated_at();

-- A location cannot silently move to another warehouse: stock and history
-- are keyed on (location, warehouse).
create or replace function private.lock_location_warehouse()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.warehouse_id <> old.warehouse_id then
    raise exception 'A location cannot be moved to a different warehouse. Create a new location instead.'
      using errcode = 'P0001', hint = 'stocksense';
  end if;
  return new;
end;
$$;
create trigger locations_lock_warehouse before update of warehouse_id on public.locations
  for each row execute function private.lock_location_warehouse();

create table public.suppliers (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (char_length(btrim(name)) between 1 and 120),
  contact_person  text check (contact_person is null or char_length(contact_person) <= 120),
  phone           text check (phone is null or char_length(phone) <= 30),
  email           text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  address         text check (address is null or char_length(address) <= 300),
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index suppliers_name_key on public.suppliers (lower(name));
create trigger suppliers_updated_at before update on public.suppliers
  for each row execute function private.set_updated_at();

create table public.customers (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (char_length(btrim(name)) between 1 and 120),
  contact_person  text check (contact_person is null or char_length(contact_person) <= 120),
  phone           text check (phone is null or char_length(phone) <= 30),
  email           text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  address         text check (address is null or char_length(address) <= 300),
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index customers_name_key on public.customers (lower(name));
create trigger customers_updated_at before update on public.customers
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Operation documents
-- References are generated server-side from sequences in BEFORE INSERT
-- triggers; any client-supplied value is overwritten. UNIQUE constraints are
-- the final guard.
-- -----------------------------------------------------------------------------
create sequence public.receipt_ref_seq;
create sequence public.delivery_ref_seq;
create sequence public.transfer_ref_seq;
create sequence public.adjustment_ref_seq;

create table public.receipts (
  id              uuid primary key default gen_random_uuid(),
  reference       text not null unique,
  supplier_id     uuid not null references public.suppliers (id) on delete restrict,
  warehouse_id    uuid not null references public.warehouses (id) on delete restrict,
  location_id     uuid not null,
  scheduled_date  date not null,
  responsible_id  uuid references public.profiles (id) on delete set null,
  status          public.operation_status not null default 'draft'
                    check (status in ('draft', 'ready', 'done', 'canceled')),
  notes           text check (notes is null or char_length(notes) <= 1000),
  created_by      uuid references public.profiles (id) on delete set null,
  confirmed_at    timestamptz,
  done_at         timestamptz,
  canceled_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  foreign key (location_id, warehouse_id) references public.locations (id, warehouse_id),
  check ((status = 'done') = (done_at is not null))
);
create index receipts_status_idx on public.receipts (status);
create index receipts_scheduled_idx on public.receipts (scheduled_date);
create index receipts_warehouse_idx on public.receipts (warehouse_id);
create index receipts_location_idx on public.receipts (location_id);
create index receipts_supplier_idx on public.receipts (supplier_id);

create table public.receipt_items (
  id          uuid primary key default gen_random_uuid(),
  receipt_id  uuid not null references public.receipts (id) on delete cascade,
  product_id  uuid not null references public.products (id) on delete restrict,
  quantity    numeric(14, 3) not null check (quantity > 0),
  unit_cost   numeric(14, 2) not null default 0 check (unit_cost >= 0),
  created_at  timestamptz not null default now(),
  unique (receipt_id, product_id)
);
create index receipt_items_product_idx on public.receipt_items (product_id);

create table public.deliveries (
  id                uuid primary key default gen_random_uuid(),
  reference         text not null unique,
  customer_id       uuid references public.customers (id) on delete restrict,
  delivery_address  text not null check (char_length(btrim(delivery_address)) between 1 and 500),
  operation_type    public.delivery_operation_type not null default 'sales_order',
  warehouse_id      uuid not null references public.warehouses (id) on delete restrict,
  location_id       uuid not null,
  scheduled_date    date not null,
  responsible_id    uuid references public.profiles (id) on delete set null,
  status            public.operation_status not null default 'draft',
  notes             text check (notes is null or char_length(notes) <= 1000),
  created_by        uuid references public.profiles (id) on delete set null,
  confirmed_at      timestamptz,
  done_at           timestamptz,
  canceled_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  foreign key (location_id, warehouse_id) references public.locations (id, warehouse_id),
  check ((status = 'done') = (done_at is not null))
);
create index deliveries_status_idx on public.deliveries (status);
create index deliveries_scheduled_idx on public.deliveries (scheduled_date);
create index deliveries_warehouse_idx on public.deliveries (warehouse_id);
create index deliveries_location_status_idx on public.deliveries (location_id, status);
create index deliveries_customer_idx on public.deliveries (customer_id);

create table public.delivery_items (
  id           uuid primary key default gen_random_uuid(),
  delivery_id  uuid not null references public.deliveries (id) on delete cascade,
  product_id   uuid not null references public.products (id) on delete restrict,
  quantity     numeric(14, 3) not null check (quantity > 0),
  created_at   timestamptz not null default now(),
  unique (delivery_id, product_id)
);
create index delivery_items_product_idx on public.delivery_items (product_id);

create table public.internal_transfers (
  id                   uuid primary key default gen_random_uuid(),
  reference            text not null unique,
  source_warehouse_id  uuid not null references public.warehouses (id) on delete restrict,
  source_location_id   uuid not null,
  dest_warehouse_id    uuid not null references public.warehouses (id) on delete restrict,
  dest_location_id     uuid not null,
  scheduled_date       date not null,
  responsible_id       uuid references public.profiles (id) on delete set null,
  status               public.operation_status not null default 'draft'
                         check (status in ('draft', 'ready', 'done', 'canceled')),
  notes                text check (notes is null or char_length(notes) <= 1000),
  created_by           uuid references public.profiles (id) on delete set null,
  confirmed_at         timestamptz,
  done_at              timestamptz,
  canceled_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  foreign key (source_location_id, source_warehouse_id) references public.locations (id, warehouse_id),
  foreign key (dest_location_id, dest_warehouse_id) references public.locations (id, warehouse_id),
  check (source_location_id <> dest_location_id),
  check ((status = 'done') = (done_at is not null))
);
create index internal_transfers_status_idx on public.internal_transfers (status);
create index internal_transfers_scheduled_idx on public.internal_transfers (scheduled_date);
create index internal_transfers_src_idx on public.internal_transfers (source_location_id);
create index internal_transfers_dest_idx on public.internal_transfers (dest_location_id);

create table public.internal_transfer_items (
  id           uuid primary key default gen_random_uuid(),
  transfer_id  uuid not null references public.internal_transfers (id) on delete cascade,
  product_id   uuid not null references public.products (id) on delete restrict,
  quantity     numeric(14, 3) not null check (quantity > 0),
  created_at   timestamptz not null default now(),
  unique (transfer_id, product_id)
);
create index internal_transfer_items_product_idx on public.internal_transfer_items (product_id);

create table public.stock_adjustments (
  id              uuid primary key default gen_random_uuid(),
  reference       text not null unique,
  warehouse_id    uuid not null references public.warehouses (id) on delete restrict,
  location_id     uuid not null,
  reason          public.adjustment_reason not null,
  notes           text check (notes is null or char_length(notes) <= 1000),
  status          public.operation_status not null default 'draft'
                    check (status in ('draft', 'done', 'canceled')),
  responsible_id  uuid references public.profiles (id) on delete set null,
  created_by      uuid references public.profiles (id) on delete set null,
  done_at         timestamptz,
  canceled_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  foreign key (location_id, warehouse_id) references public.locations (id, warehouse_id),
  check ((status = 'done') = (done_at is not null))
);
create index stock_adjustments_status_idx on public.stock_adjustments (status);
create index stock_adjustments_location_idx on public.stock_adjustments (location_id);
create index stock_adjustments_warehouse_idx on public.stock_adjustments (warehouse_id);

create table public.stock_adjustment_items (
  id                uuid primary key default gen_random_uuid(),
  adjustment_id     uuid not null references public.stock_adjustments (id) on delete cascade,
  product_id        uuid not null references public.products (id) on delete restrict,
  counted_quantity  numeric(14, 3) not null check (counted_quantity >= 0),
  -- snapshot taken under row lock when the adjustment is applied
  system_quantity   numeric(14, 3),
  difference        numeric(14, 3),
  created_at        timestamptz not null default now(),
  unique (adjustment_id, product_id),
  check ((system_quantity is null) = (difference is null))
);
create index stock_adjustment_items_product_idx on public.stock_adjustment_items (product_id);

-- Reference generators -------------------------------------------------------
create or replace function private.assign_reference()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.reference := case tg_table_name
    when 'receipts'           then private.format_reference('WH/IN/',  nextval('public.receipt_ref_seq'))
    when 'deliveries'         then private.format_reference('WH/OUT/', nextval('public.delivery_ref_seq'))
    when 'internal_transfers' then private.format_reference('TR/',     nextval('public.transfer_ref_seq'))
    when 'stock_adjustments'  then private.format_reference('ADJ/',    nextval('public.adjustment_ref_seq'))
  end;
  return new;
end;
$$;

create or replace function private.freeze_reference()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.reference is distinct from old.reference then
    raise exception 'Document references cannot be changed.' using errcode = 'P0001', hint = 'stocksense';
  end if;
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['receipts', 'deliveries', 'internal_transfers', 'stock_adjustments'] loop
    execute format('create trigger %1$s_reference before insert on public.%1$I for each row execute function private.assign_reference()', t);
    execute format('create trigger %1$s_reference_frozen before update of reference on public.%1$I for each row execute function private.freeze_reference()', t);
    execute format('create trigger %1$s_updated_at before update on public.%1$I for each row execute function private.set_updated_at()', t);
  end loop;
end;
$$;
