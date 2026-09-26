"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyDbError } from "@/lib/errors";
import type { ActionResult } from "@/lib/action-result";
import { receiptSchema, type ReceiptInput } from "@/lib/validations/receipts";

type CreateReceiptData = { id: string; reference: string; status: "draft" | "ready" };

/**
 * Creates a receipt (draft) + its line items. There is no multi-table transaction
 * available from the JS client, so on item-insert failure we best-effort delete the
 * orphaned receipt row before returning the error.
 *
 * When `validate` is true, immediately calls the `confirm_receipt` RPC after the
 * insert succeeds (draft -> ready). If that RPC call fails, the receipt still exists
 * as a draft — we report success with a warning message rather than losing the record.
 */
export async function createReceipt(
  input: ReceiptInput,
  opts?: { validate?: boolean }
): Promise<ActionResult<CreateReceiptData>> {
  const parsed = receiptSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in to perform this action." };

  const { supplier_id, warehouse_id, location_id, scheduled_date, responsible_id, notes, items } = parsed.data;

  const { data: receipt, error: receiptError } = await supabase
    .from("receipts")
    .insert({
      supplier_id,
      warehouse_id,
      location_id,
      scheduled_date,
      responsible_id: responsible_id ?? user.id,
      notes: notes?.trim() || null,
      created_by: user.id,
    })
    .select("id, reference")
    .single();

  if (receiptError || !receipt) {
    return { ok: false, error: friendlyDbError(receiptError, "receipt") };
  }

  const { error: itemsError } = await supabase.from("receipt_items").insert(
    items.map((i) => ({
      receipt_id: receipt.id,
      product_id: i.product_id,
      quantity: i.quantity,
      unit_cost: i.unit_cost ?? 0,
    }))
  );

  if (itemsError) {
    await supabase.from("receipts").delete().eq("id", receipt.id);
    return { ok: false, error: friendlyDbError(itemsError, "receipt") };
  }

  revalidatePath("/operations/receipts");
  revalidatePath(`/operations/receipts/${receipt.id}`);

  if (!opts?.validate) {
    return { ok: true, data: { id: receipt.id, reference: receipt.reference, status: "draft" } };
  }

  const { error: confirmError } = await supabase.rpc("confirm_receipt", { p_receipt_id: receipt.id });
  if (confirmError) {
    return {
      ok: true,
      data: { id: receipt.id, reference: receipt.reference, status: "draft" },
      message: `Receipt ${receipt.reference} was saved as a draft, but could not be confirmed: ${friendlyDbError(confirmError, "receipt")}`,
    };
  }

  revalidatePath(`/operations/receipts/${receipt.id}`);
  return { ok: true, data: { id: receipt.id, reference: receipt.reference, status: "ready" } };
}

export async function confirmReceiptAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_receipt", { p_receipt_id: id });
  if (error) return { ok: false, error: friendlyDbError(error, "receipt") };
  revalidatePath("/operations/receipts");
  revalidatePath(`/operations/receipts/${id}`);
  return { ok: true };
}

export async function completeReceiptAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_receipt", { p_receipt_id: id });
  if (error) return { ok: false, error: friendlyDbError(error, "receipt") };
  revalidatePath("/operations/receipts");
  revalidatePath(`/operations/receipts/${id}`);
  return { ok: true };
}

export async function cancelReceiptAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_receipt", { p_receipt_id: id });
  if (error) return { ok: false, error: friendlyDbError(error, "receipt") };
  revalidatePath("/operations/receipts");
  revalidatePath(`/operations/receipts/${id}`);
  return { ok: true };
}
