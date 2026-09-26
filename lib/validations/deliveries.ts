import { z } from "zod";

export const deliveryOperationTypes = [
  "sales_order",
  "sample",
  "replacement",
  "return_to_vendor",
  "other",
] as const;

export const deliveryOperationTypeLabels: Record<(typeof deliveryOperationTypes)[number], string> = {
  sales_order: "Sales Order",
  sample: "Sample",
  replacement: "Replacement",
  return_to_vendor: "Return to Vendor",
  other: "Other",
};

export const deliveryItemSchema = z.object({
  product_id: z.string().min(1, "Select a product").uuid("Select a product"),
  quantity: z.coerce
    .number({ error: "Enter a quantity" })
    .positive("Quantity must be greater than 0"),
});

export const deliverySchema = z
  .object({
    customer_id: z.string().uuid().optional().nullable(),
    delivery_address: z
      .string()
      .trim()
      .min(1, "Enter a delivery address")
      .max(500, "Delivery address must be at most 500 characters"),
    operation_type: z.enum(deliveryOperationTypes),
    warehouse_id: z.string().min(1, "Select a warehouse").uuid("Select a warehouse"),
    location_id: z.string().min(1, "Select a location").uuid("Select a location"),
    scheduled_date: z.string().min(1, "Select a schedule date"),
    responsible_id: z.string().uuid().optional().nullable(),
    notes: z.string().max(1000, "Notes must be at most 1000 characters").optional().nullable(),
    items: z.array(deliveryItemSchema).min(1, "Add at least one product"),
  })
  .refine((v) => new Set(v.items.map((i) => i.product_id)).size === v.items.length, {
    message: "Each product can only appear once. Remove or merge duplicate rows.",
    path: ["items"],
  });

export type DeliveryInput = z.infer<typeof deliverySchema>;
export type DeliveryItemInput = z.infer<typeof deliveryItemSchema>;
