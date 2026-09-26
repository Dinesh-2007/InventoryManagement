"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyDbError } from "@/lib/errors";
import type { ActionResult } from "@/lib/action-result";
import { warehouseSchema, type WarehouseInput } from "@/lib/validations/warehouses";

/**
 * Maps a unique-constraint violation back to the offending form field.
 *
 * Postgres omits `error.details` (and with it the offending value) for roles
 * that only have RLS-based access without explicit column-level GRANTs —
 * which is exactly our RLS-scoped `authenticated` role — so `error.details`
 * comes back `null` in production even though it's populated when testing
 * with the service-role key. `error.message` always includes the constraint
 * name regardless of role, so we match on that instead and build the
 * message from the value we already have locally (no need to parse it back
 * out of a detail string we'll never receive).
 */
function duplicateFieldErrors(
  error: { code?: string; message?: string; details?: string } | null,
  input: WarehouseInput,
): { error: string; fieldErrors: Record<string, string> } | undefined {
  if (error?.code !== "23505") return undefined;
  const haystack = `${error.message ?? ""} ${error.details ?? ""}`;
  if (/warehouses_short_code_key|short_code/.test(haystack)) {
    const message = `Short code "${input.shortCode}" is already in use.`;
    return { error: message, fieldErrors: { shortCode: message } };
  }
  return undefined;
}

export async function createWarehouse(input: WarehouseInput): Promise<ActionResult<{ id: string }>> {
  const parsed = warehouseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("warehouses")
    .insert({ name: parsed.data.name, short_code: parsed.data.shortCode, address: parsed.data.address || null })
    .select("id")
    .single();
  if (error) {
    const dup = duplicateFieldErrors(error, parsed.data);
    return { ok: false, error: dup?.error ?? friendlyDbError(error, "createWarehouse"), fieldErrors: dup?.fieldErrors };
  }

  revalidatePath("/settings/warehouses");
  return { ok: true, data: { id: data.id }, message: "Warehouse created." };
}

export async function updateWarehouse(id: string, input: WarehouseInput): Promise<ActionResult> {
  const parsed = warehouseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = createClient();
  const { error } = await supabase
    .from("warehouses")
    .update({ name: parsed.data.name, short_code: parsed.data.shortCode, address: parsed.data.address || null })
    .eq("id", id);
  if (error) {
    const dup = duplicateFieldErrors(error, parsed.data);
    return { ok: false, error: dup?.error ?? friendlyDbError(error, "updateWarehouse"), fieldErrors: dup?.fieldErrors };
  }

  revalidatePath("/settings/warehouses");
  revalidatePath(`/settings/warehouses/${id}`);
  return { ok: true, message: "Warehouse updated." };
}

export async function setWarehouseActive(id: string, active: boolean): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from("warehouses").update({ active }).eq("id", id);
  if (error) return { ok: false, error: friendlyDbError(error, "setWarehouseActive") };

  revalidatePath("/settings/warehouses");
  return { ok: true, message: active ? "Warehouse activated." : "Warehouse deactivated." };
}
