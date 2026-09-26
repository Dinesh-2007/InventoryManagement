"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyDbError } from "@/lib/errors";
import type { ActionResult } from "@/lib/action-result";

export const customerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120, "Max 120 characters"),
  contactPerson: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.union([z.email("Enter a valid email"), z.literal("")]).optional(),
  address: z.string().trim().max(300).optional().or(z.literal("")),
});
export type CustomerInput = z.infer<typeof customerSchema>;

function toRow(v: CustomerInput) {
  return {
    name: v.name,
    contact_person: v.contactPerson || null,
    phone: v.phone || null,
    email: v.email || null,
    address: v.address || null,
  };
}

export async function createCustomer(input: CustomerInput): Promise<ActionResult<{ id: string }>> {
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.from("customers").insert(toRow(parsed.data)).select("id").single();
  if (error) return { ok: false, error: friendlyDbError(error, "createCustomer") };

  revalidatePath("/settings/customers");
  return { ok: true, data: { id: data.id }, message: "Customer created." };
}

export async function updateCustomer(id: string, input: CustomerInput): Promise<ActionResult> {
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("customers").update(toRow(parsed.data)).eq("id", id);
  if (error) return { ok: false, error: friendlyDbError(error, "updateCustomer") };

  revalidatePath("/settings/customers");
  return { ok: true, message: "Customer updated." };
}

export async function setCustomerActive(id: string, active: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("customers").update({ active }).eq("id", id);
  if (error) return { ok: false, error: friendlyDbError(error, "setCustomerActive") };

  revalidatePath("/settings/customers");
  return { ok: true, message: active ? "Customer activated." : "Customer deactivated." };
}
