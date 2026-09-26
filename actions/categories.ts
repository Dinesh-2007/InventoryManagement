"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyDbError } from "@/lib/errors";
import type { ActionResult } from "@/lib/action-result";
import { categorySchema, type CategoryInput } from "@/lib/validations/products";

export async function createCategory(input: CategoryInput): Promise<ActionResult<{ id: string }>> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_categories")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description || null,
    })
    .select("id")
    .single();

  if (error) {
    const fieldErrors = error.code === "23505" ? { name: `Category "${parsed.data.name}" already exists.` } : undefined;
    return { ok: false, error: friendlyDbError(error, "createCategory"), fieldErrors };
  }

  revalidatePath("/products/categories");
  return { ok: true, data: { id: data.id } };
}

export async function updateCategory(id: string, input: CategoryInput): Promise<ActionResult> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("product_categories")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
    })
    .eq("id", id);

  if (error) {
    const fieldErrors = error.code === "23505" ? { name: `Category "${parsed.data.name}" already exists.` } : undefined;
    return { ok: false, error: friendlyDbError(error, "updateCategory"), fieldErrors };
  }

  revalidatePath("/products/categories");
  return { ok: true };
}

export async function setCategoryActive(id: string, active: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("product_categories").update({ active }).eq("id", id);
  if (error) return { ok: false, error: friendlyDbError(error, "setCategoryActive") };
  revalidatePath("/products/categories");
  return { ok: true };
}
