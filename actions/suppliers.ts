"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyDbError } from "@/lib/errors";
import type { ActionResult } from "@/lib/action-result";
import { supplierSchema, type SupplierInput } from "@/lib/validations/suppliers";

function toRow(v: SupplierInput) {
  return {
    name: v.name,
    contact_person: v.contactPerson || null,
    phone: v.phone || null,
    email: v.email || null,
    address: v.address || null,
  };
}

export async function createSupplier(input: SupplierInput): Promise<ActionResult<{ id: string }>> {
  const parsed = supplierSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = createClient();
  const { data, error } = await supabase.from("suppliers").insert(toRow(parsed.data)).select("id").single();
  if (error) return { ok: false, error: friendlyDbError(error, "createSupplier") };

  revalidatePath("/settings/suppliers");
  return { ok: true, data: { id: data.id }, message: "Supplier created." };
}

export async function updateSupplier(id: string, input: SupplierInput): Promise<ActionResult> {
  const parsed = supplierSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = createClient();
  const { error } = await supabase.from("suppliers").update(toRow(parsed.data)).eq("id", id);
  if (error) return { ok: false, error: friendlyDbError(error, "updateSupplier") };

  revalidatePath("/settings/suppliers");
  return { ok: true, message: "Supplier updated." };
}

export async function setSupplierActive(id: string, active: boolean): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from("suppliers").update({ active }).eq("id", id);
  if (error) return { ok: false, error: friendlyDbError(error, "setSupplierActive") };

  revalidatePath("/settings/suppliers");
  return { ok: true, message: active ? "Supplier activated." : "Supplier deactivated." };
}
