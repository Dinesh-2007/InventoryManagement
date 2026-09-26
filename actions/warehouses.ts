"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyDbError } from "@/lib/errors";
import type { ActionResult } from "@/lib/action-result";
import { warehouseSchema, type WarehouseInput } from "@/lib/validations/warehouses";

/** Maps a unique-constraint violation's column back to the form field so the error shows inline. */
function duplicateFieldErrors(error: { code?: string; details?: string } | null): Record<string, string> | undefined {
  if (error?.code !== "23505") return undefined;
  if (/short_code/.test(error.details ?? "")) return { shortCode: "This short code is already in use." };
  if (/\bname\b/.test(error.details ?? "")) return { name: "This name is already in use." };
  return undefined;
}

export async function createWarehouse(input: WarehouseInput): Promise<ActionResult<{ id: string }>> {
  const parsed = warehouseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("warehouses")
    .insert({ name: parsed.data.name, short_code: parsed.data.shortCode, address: parsed.data.address || null })
    .select("id")
    .single();
  if (error) return { ok: false, error: friendlyDbError(error, "createWarehouse"), fieldErrors: duplicateFieldErrors(error) };

  revalidatePath("/settings/warehouses");
  return { ok: true, data: { id: data.id }, message: "Warehouse created." };
}

export async function updateWarehouse(id: string, input: WarehouseInput): Promise<ActionResult> {
  const parsed = warehouseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("warehouses")
    .update({ name: parsed.data.name, short_code: parsed.data.shortCode, address: parsed.data.address || null })
    .eq("id", id);
  if (error) return { ok: false, error: friendlyDbError(error, "updateWarehouse"), fieldErrors: duplicateFieldErrors(error) };

  revalidatePath("/settings/warehouses");
  revalidatePath(`/settings/warehouses/${id}`);
  return { ok: true, message: "Warehouse updated." };
}

export async function setWarehouseActive(id: string, active: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("warehouses").update({ active }).eq("id", id);
  if (error) return { ok: false, error: friendlyDbError(error, "setWarehouseActive") };

  revalidatePath("/settings/warehouses");
  return { ok: true, message: active ? "Warehouse activated." : "Warehouse deactivated." };
}
