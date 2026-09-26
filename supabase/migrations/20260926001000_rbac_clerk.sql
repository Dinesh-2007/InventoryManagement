-- =============================================================================
-- StockSense — RBAC with Clerk
-- Extends profiles with clerk_user_id, employee_id, status.
-- Adds user_warehouse_access and user_location_access tables.
-- Adds DB helpers for Clerk identity resolution.
-- Updates is_manager() and require_user() to use Clerk identity.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Extend profiles table
-- -----------------------------------------------------------------------------

alter table public.profiles
  add column if not exists clerk_user_id text unique,
  add column if not exists employee_id   text unique
    check (employee_id is null or char_length(employee_id) <= 40),
  add column if not exists status        text not null default 'active'
    check (status in ('active', 'inactive', 'suspended'));

create index if not exists profiles_clerk_user_id_idx on public.profiles (clerk_user_id);

-- Protect clerk_user_id from being changed via direct UPDATE
drop trigger if exists profiles_protect_fields on public.profiles;

create or replace function private.protect_profile_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.role          := old.role;
  new.login_id      := old.login_id;
  new.email         := old.email;
  new.clerk_user_id := old.clerk_user_id;
  return new;
end;
$$;

create trigger profiles_protect_fields before update on public.profiles
  for each row execute function private.protect_profile_fields();

-- -----------------------------------------------------------------------------
-- 2. Clerk user resolution helper
-- Reads request.clerk_user_id GUC set by the server before any query.
-- On the server-side service_role path, RLS is bypassed, but the GUC is still
-- useful for logic inside SECURITY DEFINER functions.
-- -----------------------------------------------------------------------------
create or replace function private.get_clerk_user_id()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select nullif(current_setting('request.clerk_user_id', true), '')
$$;

create or replace function public.current_clerk_user_id()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select private.get_clerk_user_id()
$$;

create or replace function public.clerk_is_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select p.role = 'inventory_manager'
      from public.profiles p
      where p.clerk_user_id = private.get_clerk_user_id()
      limit 1
    ),
    false
  )
$$;

-- -----------------------------------------------------------------------------
-- 3. user_warehouse_access
-- -----------------------------------------------------------------------------
create table if not exists public.user_warehouse_access (
  id            uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  warehouse_id  uuid not null references public.warehouses (id) on delete cascade,
  granted_at    timestamptz not null default now(),
  granted_by    text,
  unique (clerk_user_id, warehouse_id)
);

create index if not exists uwa_clerk_user_id_idx on public.user_warehouse_access (clerk_user_id);
create index if not exists uwa_warehouse_id_idx  on public.user_warehouse_access (warehouse_id);

alter table public.user_warehouse_access enable row level security;
revoke all on public.user_warehouse_access from anon;
grant select, insert, update, delete on public.user_warehouse_access to authenticated;

create policy uwa_select on public.user_warehouse_access
  for select to authenticated
  using (
    clerk_user_id = public.current_clerk_user_id()
    or public.clerk_is_manager()
  );

create policy uwa_insert on public.user_warehouse_access
  for insert to authenticated
  with check (public.clerk_is_manager());

create policy uwa_delete on public.user_warehouse_access
  for delete to authenticated
  using (public.clerk_is_manager());

-- -----------------------------------------------------------------------------
-- 4. user_location_access
-- -----------------------------------------------------------------------------
create table if not exists public.user_location_access (
  id            uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  location_id   uuid not null references public.locations (id) on delete cascade,
  granted_at    timestamptz not null default now(),
  granted_by    text,
  unique (clerk_user_id, location_id)
);

create index if not exists ula_clerk_user_id_idx on public.user_location_access (clerk_user_id);
create index if not exists ula_location_id_idx   on public.user_location_access (location_id);

alter table public.user_location_access enable row level security;
revoke all on public.user_location_access from anon;
grant select, insert, update, delete on public.user_location_access to authenticated;

create policy ula_select on public.user_location_access
  for select to authenticated
  using (
    clerk_user_id = public.current_clerk_user_id()
    or public.clerk_is_manager()
  );

create policy ula_insert on public.user_location_access
  for insert to authenticated
  with check (public.clerk_is_manager());

create policy ula_delete on public.user_location_access
  for delete to authenticated
  using (public.clerk_is_manager());

-- -----------------------------------------------------------------------------
-- 5. Update public.is_manager() to use Clerk identity
-- The existing function used auth.uid() which is no longer populated.
-- Replace body only (return type stays boolean).
-- -----------------------------------------------------------------------------
create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.clerk_is_manager()
$$;

-- -----------------------------------------------------------------------------
-- 6. private.require_user() — keep UUID return type for backward compat
-- All existing stock functions declare: v_uid uuid := private.require_user()
-- We can't change the return type without dropping dependents, so we keep
-- returning UUID (null — since Clerk IDs are text, not UUID) but we still
-- perform the authentication check via Clerk identity.
-- -----------------------------------------------------------------------------
create or replace function private.require_user()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_cid text := private.get_clerk_user_id();
begin
  if v_cid is null or not exists (
    select 1 from public.profiles where clerk_user_id = v_cid
  ) then
    raise exception 'You must be signed in to perform this action.'
      using errcode = '28000', hint = 'stocksense';
  end if;
  -- Return null UUID: stock functions use v_uid only for activity log inserts
  -- where performed_by is nullable. The real Clerk ID is tracked separately.
  return null;
end;
$$;

-- New text-returning variant for new code paths that need the Clerk user ID
create or replace function private.require_clerk_user()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_cid text := private.get_clerk_user_id();
begin
  if v_cid is null or not exists (
    select 1 from public.profiles where clerk_user_id = v_cid
  ) then
    raise exception 'You must be signed in to perform this action.'
      using errcode = '28000', hint = 'stocksense';
  end if;
  return v_cid;
end;
$$;

-- -----------------------------------------------------------------------------
-- 7. private.require_manager() — keep UUID return type for backward compat
-- -----------------------------------------------------------------------------
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
  if not public.clerk_is_manager() then
    raise exception 'Only inventory managers can perform this action.'
      using errcode = '42501', hint = 'stocksense';
  end if;
  return v_uid;
end;
$$;

-- -----------------------------------------------------------------------------
-- 8. Update profiles RLS to use clerk_user_id
-- -----------------------------------------------------------------------------
drop policy if exists profiles_update_own on public.profiles;

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (clerk_user_id = public.current_clerk_user_id())
  with check (clerk_user_id = public.current_clerk_user_id());
