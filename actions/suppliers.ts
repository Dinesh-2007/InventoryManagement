"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyDbError } from "@/lib/errors";
import type { ActionResult } from "@/lib/action-result";

export const supplierSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120, "Max 120 characters"),
  contactPerson: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.union([z.email("Enter a valid email"), z.literal("")]).optional(),
  address: z.string().trim().max(300).optional().or(z.literal("")),
});
export type SupplierInput = z.infer<typeof supplierSchema>;

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

  const supabase = await createClient();
  const { data, error } = await supabase.from("suppliers").insert(toRow(parsed.data)).select("id").single();
  if (error) return { ok: false, error: friendlyDbError(error, "createSupplier") };

  revalidatePath("/settings/suppliers");
  return { ok: true, data: { id: data.id }, message: "Supplier created." };
}

export async function updateSupplier(id: string, input: SupplierInput): Promise<ActionResult> {
  const parsed = supplierSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").update(toRow(parsed.data)).eq("id", id);
  if (error) return { ok: false, error: friendlyDbError(error, "updateSupplier") };

  revalidatePath("/settings/suppliers");
  return { ok: true, message: "Supplier updated." };
}

export async function setSupplierActive(id: string, active: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").update({ active }).eq("id", id);
  if (error) return { ok: false, error: friendlyDbError(error, "setSupplierActive") };

  revalidatePath("/settings/suppliers");
  return { ok: true, message: active ? "Supplier activated." : "Supplier deactivated." };
}
