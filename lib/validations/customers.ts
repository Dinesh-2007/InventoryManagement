import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120, "Max 120 characters"),
  contactPerson: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.union([z.email("Enter a valid email"), z.literal("")]).optional(),
  address: z.string().trim().max(300).optional().or(z.literal("")),
});
export type CustomerInput = z.infer<typeof customerSchema>;
