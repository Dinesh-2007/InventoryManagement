"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyDbError } from "@/lib/errors";
import type { ActionResult } from "@/lib/action-result";
import {
  productSchema, productUpdateSchema, reorderRuleSchema,
  type ProductInput, type ProductUpdateInput, type ReorderRuleInput,
} from "@/lib/validations/products";

function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in out)) out[key] = issue.message;
  }
  return out;
}

function revalidateProductPaths(id?: string) {
  revalidatePath("/products");
  revalidatePath("/products/reorder-rules");
  revalidatePath("/stock");
  if (id) revalidatePath(`/products/${id}`);
}

export async function createProduct(input: ProductInput): Promise<ActionResult<{ id: string }>> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message, fieldErrors: zodFieldErrors(parsed.error) };
  }
  const { data } = parsed;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in to perform this action." };

  const initialStock = data.initial_stock ?? 0;

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      name: data.name,
      sku: data.sku,
      category_id: data.category_id,
      unit_of_measure: data.unit_of_measure,
      per_unit_cost: data.per_unit_cost,
      reorder_point: data.reorder_point,
      reorder_quantity: data.reorder_quantity,
      initial_stock: initialStock,
      description: data.description || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !product) {
    if (error?.code === "23505" && /sku/i.test(`${error.details ?? ""}${error.message ?? ""}`)) {
      const msg = `SKU ${data.sku} already exists.`;
      return { ok: false, error: msg, fieldErrors: { sku: msg } };
    }
    return { ok: false, error: friendlyDbError(error, "createProduct") };
  }

  if (initialStock > 0 && data.initial_location_id) {
    const { error: balanceError } = await supabase
      .from("inventory_balances")
      .upsert(
        { product_id: product.id, location_id: data.initial_location_id, quantity_on_hand: initialStock },
        { onConflict: "product_id,location_id" },
      );
    if (balanceError) {
      return { ok: false, error: friendlyDbError(balanceError, "createProduct:balance") };
    }

    const { error: ledgerError } = await supabase.from("stock_ledger").insert({
      product_id: product.id,
      location_id: data.initial_location_id,
      movement_type: "ADJUSTMENT",
      reason: "initial_stock",
      quantity: initialStock,
      reference_type: "product",
      reference_id: product.id,
      performed_by: user.id,
    });
    if (ledgerError) console.error("[createProduct] stock_ledger insert failed", ledgerError);
  }

  revalidateProductPaths(product.id);
  redirect("/products");
}

export async function updateProduct(id: string, input: ProductUpdateInput): Promise<ActionResult> {
  const parsed = productUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message, fieldErrors: zodFieldErrors(parsed.error) };
  }
  const { data } = parsed;

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({
      name: data.name,
      sku: data.sku,
      category_id: data.category_id,
      unit_of_measure: data.unit_of_measure,
      per_unit_cost: data.per_unit_cost,
      reorder_point: data.reorder_point,
      reorder_quantity: data.reorder_quantity,
      description: data.description || null,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505" && /sku/i.test(`${error.details ?? ""}${error.message ?? ""}`)) {
      const msg = `SKU ${data.sku} already exists.`;
      return { ok: false, error: msg, fieldErrors: { sku: msg } };
    }
    return { ok: false, error: friendlyDbError(error, "updateProduct") };
  }

  revalidateProductPaths(id);
  redirect(`/products/${id}`);
}

/** Reorder-rules page: edits only reorder_point/reorder_quantity. */
export async function updateReorderRule(id: string, input: ReorderRuleInput): Promise<ActionResult> {
  const parsed = reorderRuleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message, fieldErrors: zodFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ reorder_point: parsed.data.reorder_point, reorder_quantity: parsed.data.reorder_quantity })
    .eq("id", id);

  if (error) return { ok: false, error: friendlyDbError(error, "updateReorderRule") };

  revalidateProductPaths(id);
  return { ok: true };
}

export async function setProductActive(id: string, active: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("products").update({ active }).eq("id", id);
  if (error) return { ok: false, error: friendlyDbError(error, "setProductActive") };
  revalidateProductPaths(id);
  return { ok: true };
}
