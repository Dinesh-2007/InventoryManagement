"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyDbError } from "@/lib/errors";
import type { ActionResult } from "@/lib/action-result";
import { adjustmentSchema, type AdjustmentInput } from "@/lib/validations/adjustments";

import { getAuthRole } from "@/lib/auth/server";

/**
 * Inserts a draft adjustment + its items (counted_quantity only; system_quantity
 * and difference are filled server-side by `apply_adjustment`). When `mode` is
 * "validate" it applies immediately (draft -> done in one step); "draft" leaves
 * it pending for a manager to apply later from the detail page.
 */
export async function createAdjustment(input: AdjustmentInput, mode: "draft" | "validate"): Promise<ActionResult<{ id: string }>> {
  const parsed = adjustmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const role = await getAuthRole();
  if (role === "warehouse_staff" && mode === "validate") {
    return { ok: false, error: "Warehouse staff can only submit count requests as drafts for manager review." };
  }

  const supabase = createClient();

  const { data: adjustment, error } = await supabase
    .from("stock_adjustments")
    .insert({
      warehouse_id: parsed.data.warehouseId,
      location_id: parsed.data.locationId,
      reason: parsed.data.reason,
      notes: parsed.data.notes || null,
      responsible_id: null,
      created_by: null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: friendlyDbError(error, "createAdjustment") };

  const { error: itemsError } = await supabase.from("stock_adjustment_items").insert(
    parsed.data.items.map((i) => ({ adjustment_id: adjustment.id, product_id: i.productId, counted_quantity: i.countedQuantity })),
  );
  if (itemsError) {
    await supabase.from("stock_adjustments").delete().eq("id", adjustment.id);
    return { ok: false, error: friendlyDbError(itemsError, "createAdjustment") };
  }

  if (mode === "validate") {
    const { error: applyError } = await supabase.rpc("apply_adjustment", { p_adjustment_id: adjustment.id });
    if (applyError) return { ok: false, error: friendlyDbError(applyError, "applyAdjustment") };
  }

  revalidatePath("/operations/adjustments");
  revalidatePath("/stock-counting");
  return { ok: true, data: { id: adjustment.id }, message: mode === "validate" ? "Adjustment applied." : "Stock count submitted for manager approval." };
}

export async function applyAdjustmentAction(id: string): Promise<ActionResult> {
  const role = await getAuthRole();
  if (role !== "inventory_manager") {
    return { ok: false, error: "Only inventory managers can apply adjustments to stock." };
  }

  const supabase = createClient();
  const { error } = await supabase.rpc("apply_adjustment", { p_adjustment_id: id });
  if (error) return { ok: false, error: friendlyDbError(error, "applyAdjustment") };

  revalidatePath("/operations/adjustments");
  revalidatePath(`/operations/adjustments/${id}`);
  return { ok: true, message: "Adjustment applied. Stock updated." };
}

export async function cancelAdjustmentAction(id: string): Promise<ActionResult> {
  const role = await getAuthRole();
  if (role !== "inventory_manager") {
    return { ok: false, error: "Only inventory managers can cancel adjustments." };
  }
  const supabase = createClient();
  const { error } = await supabase.rpc("cancel_adjustment", { p_adjustment_id: id });
  if (error) return { ok: false, error: friendlyDbError(error, "cancelAdjustment") };

  revalidatePath("/operations/adjustments");
  revalidatePath(`/operations/adjustments/${id}`);
  return { ok: true, message: "Adjustment canceled." };
}
