import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "./env";

/**
 * Server-side Supabase client using the service role key.
 * Auth (authentication / session) is handled by Clerk; this client bypasses
 * Supabase RLS so all server components and server actions can read/write data
 * without a Supabase session token. Never import in client components.
 */
export function createClient() {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
