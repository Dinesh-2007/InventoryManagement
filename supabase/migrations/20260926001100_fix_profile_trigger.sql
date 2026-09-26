-- =============================================================================
-- Fix protect_profile_fields trigger
-- Allows linking clerk_user_id when old.clerk_user_id is null.
-- Allows updating role when request.allow_role_update is set to 'true'.
-- =============================================================================

create or replace function private.protect_profile_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Allow setting clerk_user_id if it was previously null
  if old.clerk_user_id is null and new.clerk_user_id is not null then
    -- allow linking Clerk user ID
  else
    new.clerk_user_id := coalesce(old.clerk_user_id, new.clerk_user_id);
  end if;

  -- Allow role update if explicitly allowed by auth action
  if nullif(current_setting('request.allow_role_update', true), '') = 'true' then
    -- allow role update
  else
    new.role := coalesce(old.role, new.role);
  end if;

  new.login_id := coalesce(old.login_id, new.login_id);
  new.email    := coalesce(old.email, new.email);
  return new;
end;
$$;
