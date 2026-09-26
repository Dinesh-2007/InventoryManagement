-- =============================================================================
-- StockSense — fix: protect_profile_fields must exempt service_role
-- 20260926000400_rls.sql's private.protect_profile_fields() unconditionally
-- reverts role/login_id/email on every UPDATE, "regardless of who's
-- updating" — which correctly blocks authenticated/anon from ever changing
-- their own role via a direct table update, but also silently no-ops the
-- ONE legitimate direct-table write to role: supabase/seed/create-users.mjs
-- promoting the demo manager account via the service-role admin client.
-- service_role is never exposed to browser/API clients (only used
-- server-side, e.g. in admin scripts), so it's safe to let it through.
-- =============================================================================

create or replace function private.protect_profile_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'service_role' then
    return new;
  end if;
  new.role := old.role;
  new.login_id := old.login_id;
  new.email := old.email;
  return new;
end;
$$;
