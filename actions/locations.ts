"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyDbError } from "@/lib/errors";
import type { ActionResult } from "@/lib/action-result";
import { locationSchema, type LocationInput } from "@/lib/validations/warehouses";

/** Maps a unique-constraint violation's column back to the form field so the error shows inline. */
function duplicateFieldErrors(error: { code?: string; details?: string } | null): Record<string, string> | undefined {
  if (error?.code !== "23505") return undefined;
  if (/short_code/.test(error.details ?? "")) return { shortCode: "This short code is already used in this warehouse." };
  return undefined;
}

export async function createLocation(input: LocationInput): Promise<ActionResult<{ id: string }>> {
  const parsed = locationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("locations")
    .insert({ name: parsed.data.name, short_code: parsed.data.shortCode, warehouse_id: parsed.data.warehouseId })
    .select("id")
    .single();
  if (error) return { ok: false, error: friendlyDbError(error, "createLocation"), fieldErrors: duplicateFieldErrors(error) };

  revalidatePath("/settings/locations");
  return { ok: true, data: { id: data.id }, message: "Location created." };
}

export async function updateLocation(id: string, input: LocationInput): Promise<ActionResult> {
  const parsed = locationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  // warehouse_id is intentionally not sent: a DB trigger locks it after creation
  // (a location can't move warehouses — create a new one instead).
  const supabase = await createClient();
  const { error } = await supabase
    .from("locations")
    .update({ name: parsed.data.name, short_code: parsed.data.shortCode })
    .eq("id", id);
  if (error) return { ok: false, error: friendlyDbError(error, "updateLocation"), fieldErrors: duplicateFieldErrors(error) };

  revalidatePath("/settings/locations");
  revalidatePath(`/settings/locations/${id}`);
  return { ok: true, message: "Location updated." };
}

export async function setLocationActive(id: string, active: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("locations").update({ active }).eq("id", id);
  if (error) return { ok: false, error: friendlyDbError(error, "setLocationActive") };

  revalidatePath("/settings/locations");
  return { ok: true, message: active ? "Location activated." : "Location deactivated." };
}
