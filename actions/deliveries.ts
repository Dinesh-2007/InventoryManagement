"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { friendlyDbError } from "@/lib/errors";
import type { ActionResult } from "@/lib/action-result";
import { deliverySchema, type DeliveryInput } from "@/lib/validations/deliveries";

type CreateDeliveryData = { id: string; reference: string; status: "draft" | "waiting" | "ready" };

/**
 * Creates a delivery (draft) + its line items. Mirrors createReceipt: no
 * multi-table transaction from the JS client, so item-insert failure triggers a
 * best-effort delete of the orphaned delivery row.
 *
 * When `validate` is true, calls `confirm_delivery` after insert, which decides
 * server-side whether the delivery becomes "waiting" (insufficient free stock) or
 * "ready". We re-fetch the resulting status so the caller can toast accordingly.
 */
export async function createDelivery(
  input: DeliveryInput,
  opts?: { validate?: boolean }
): Promise<ActionResult<CreateDeliveryData>> {
  const parsed = deliverySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const clerkUser = await currentUser();
  if (!clerkUser) return { ok: false, error: "You must be signed in to perform this action." };

  const supabase = createClient();
  const {
    customer_id,
    delivery_address,
    operation_type,
    warehouse_id,
    location_id,
    scheduled_date,
    responsible_id,
    notes,
    items,
  } = parsed.data;

  const { data: delivery, error: deliveryError } = await supabase
    .from("deliveries")
    .insert({
      customer_id: customer_id || null,
      delivery_address,
      operation_type,
      warehouse_id,
      location_id,
      scheduled_date,
      responsible_id: responsible_id ?? null,
      notes: notes?.trim() || null,
      created_by: null,
    })
    .select("id, reference")
    .single();

  if (deliveryError || !delivery) {
    return { ok: false, error: friendlyDbError(deliveryError, "delivery") };
  }

  const { error: itemsError } = await supabase
    .from("delivery_items")
    .insert(items.map((i) => ({ delivery_id: delivery.id, product_id: i.product_id, quantity: i.quantity })));

  if (itemsError) {
    await supabase.from("deliveries").delete().eq("id", delivery.id);
    return { ok: false, error: friendlyDbError(itemsError, "delivery") };
  }

  revalidatePath("/operations/deliveries");
  revalidatePath(`/operations/deliveries/${delivery.id}`);

  if (!opts?.validate) {
    return { ok: true, data: { id: delivery.id, reference: delivery.reference, status: "draft" } };
  }

  const { error: confirmError } = await supabase.rpc("confirm_delivery", { p_delivery_id: delivery.id });
  if (confirmError) {
    return {
      ok: true,
      data: { id: delivery.id, reference: delivery.reference, status: "draft" },
      message: `Delivery ${delivery.reference} was saved as a draft, but could not be confirmed: ${friendlyDbError(confirmError, "delivery")}`,
    };
  }

  const { data: refreshed } = await supabase.from("deliveries").select("status").eq("id", delivery.id).single();
  revalidatePath(`/operations/deliveries/${delivery.id}`);
  const status = (refreshed?.status as "waiting" | "ready" | undefined) ?? "ready";
  return { ok: true, data: { id: delivery.id, reference: delivery.reference, status } };
}

export async function confirmDeliveryAction(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc("confirm_delivery", { p_delivery_id: id });
  if (error) return { ok: false, error: friendlyDbError(error, "delivery") };
  revalidatePath("/operations/deliveries");
  revalidatePath(`/operations/deliveries/${id}`);
  return { ok: true };
}

export async function completeDeliveryAction(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc("complete_delivery", { p_delivery_id: id });
  if (error) return { ok: false, error: friendlyDbError(error, "delivery") };
  revalidatePath("/operations/deliveries");
  revalidatePath(`/operations/deliveries/${id}`);
  return { ok: true };
}

export async function cancelDeliveryAction(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc("cancel_delivery", { p_delivery_id: id });
  if (error) return { ok: false, error: friendlyDbError(error, "delivery") };
  revalidatePath("/operations/deliveries");
  revalidatePath(`/operations/deliveries/${id}`);
  return { ok: true };
}

export async function recheckDeliveryAvailabilityAction(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc("recompute_delivery_readiness", { p_delivery_id: id });
  if (error) return { ok: false, error: friendlyDbError(error, "delivery") };
  revalidatePath("/operations/deliveries");
  revalidatePath(`/operations/deliveries/${id}`);
  return { ok: true };
}
