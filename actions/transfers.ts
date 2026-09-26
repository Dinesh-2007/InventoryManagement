"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyDbError } from "@/lib/errors";
import type { ActionResult } from "@/lib/action-result";
import { transferSchema, type TransferInput } from "@/lib/validations/transfers";

/**
 * Inserts a draft transfer + its items. When `mode` is "validate" it also
 * calls the `confirm_transfer` RPC (draft -> ready) in the same request.
 */
export async function createTransfer(input: TransferInput, mode: "draft" | "validate"): Promise<ActionResult<{ id: string }>> {
  const parsed = transferSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = createClient();

  const { data: transfer, error } = await supabase
    .from("internal_transfers")
    .insert({
      source_warehouse_id: parsed.data.sourceWarehouseId,
      source_location_id: parsed.data.sourceLocationId,
      dest_warehouse_id: parsed.data.destWarehouseId,
      dest_location_id: parsed.data.destLocationId,
      scheduled_date: parsed.data.scheduledDate,
      responsible_id: parsed.data.responsibleId || null,
      notes: parsed.data.notes || null,
      created_by: null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: friendlyDbError(error, "createTransfer") };

  const { error: itemsError } = await supabase.from("internal_transfer_items").insert(
    parsed.data.items.map((i) => ({ transfer_id: transfer.id, product_id: i.productId, quantity: i.quantity })),
  );
  if (itemsError) {
    await supabase.from("internal_transfers").delete().eq("id", transfer.id);
    return { ok: false, error: friendlyDbError(itemsError, "createTransfer") };
  }

  if (mode === "validate") {
    const { error: confirmError } = await supabase.rpc("confirm_transfer", { p_transfer_id: transfer.id });
    if (confirmError) return { ok: false, error: friendlyDbError(confirmError, "confirmTransfer") };
  }

  revalidatePath("/operations/transfers");
  return { ok: true, data: { id: transfer.id }, message: mode === "validate" ? "Transfer validated." : "Transfer saved as draft." };
}

export async function confirmTransferAction(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc("confirm_transfer", { p_transfer_id: id });
  if (error) return { ok: false, error: friendlyDbError(error, "confirmTransfer") };

  revalidatePath("/operations/transfers");
  revalidatePath(`/operations/transfers/${id}`);
  return { ok: true, message: "Transfer validated." };
}

export async function completeTransferAction(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc("complete_transfer", { p_transfer_id: id });
  if (error) return { ok: false, error: friendlyDbError(error, "completeTransfer") };

  revalidatePath("/operations/transfers");
  revalidatePath(`/operations/transfers/${id}`);
  return { ok: true, message: "Transfer completed. Stock moved." };
}

export async function cancelTransferAction(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc("cancel_transfer", { p_transfer_id: id });
  if (error) return { ok: false, error: friendlyDbError(error, "cancelTransfer") };

  revalidatePath("/operations/transfers");
  revalidatePath(`/operations/transfers/${id}`);
  return { ok: true, message: "Transfer canceled." };
}
