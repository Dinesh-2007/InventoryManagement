import { z } from "zod";

export const receiptItemSchema = z.object({
  product_id: z.string().min(1, "Select a product").uuid("Select a product"),
  quantity: z.coerce
    .number({ error: "Enter a quantity" })
    .positive("Quantity must be greater than 0"),
  unit_cost: z.coerce.number().min(0, "Unit cost cannot be negative").optional().default(0),
});

export const receiptSchema = z
  .object({
    supplier_id: z.string().min(1, "Select a supplier").uuid("Select a supplier"),
    warehouse_id: z.string().min(1, "Select a warehouse").uuid("Select a warehouse"),
    location_id: z.string().min(1, "Select a location").uuid("Select a location"),
    scheduled_date: z.string().min(1, "Select a schedule date"),
    responsible_id: z.string().uuid().optional().nullable(),
    notes: z.string().max(1000, "Notes must be at most 1000 characters").optional().nullable(),
    items: z.array(receiptItemSchema).min(1, "Add at least one product"),
  })
  .refine((v) => new Set(v.items.map((i) => i.product_id)).size === v.items.length, {
    message: "Each product can only appear once. Remove or merge duplicate rows.",
    path: ["items"],
  });

export type ReceiptInput = z.infer<typeof receiptSchema>;
export type ReceiptItemInput = z.infer<typeof receiptItemSchema>;
