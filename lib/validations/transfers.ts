import { z } from "zod";

export const transferLineSchema = z.object({
  productId: z.uuid(),
  quantity: z.number().positive("Quantity must be greater than 0"),
});

export const transferSchema = z
  .object({
    sourceWarehouseId: z.uuid("Select a source warehouse"),
    sourceLocationId: z.uuid("Select a source location"),
    destWarehouseId: z.uuid("Select a destination warehouse"),
    destLocationId: z.uuid("Select a destination location"),
    scheduledDate: z.string().min(1, "Select a schedule date"),
    responsibleId: z.union([z.uuid(), z.literal("")]).optional(),
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
    items: z.array(transferLineSchema).min(1, "Add at least one product"),
  })
  .refine((v) => v.sourceLocationId && v.destLocationId ? v.sourceLocationId !== v.destLocationId : true, {
    message: "Source and destination locations must be different",
    path: ["destLocationId"],
  })
  .refine((v) => new Set(v.items.map((i) => i.productId)).size === v.items.length, {
    message: "Each product can only appear once. Remove the duplicate line.",
    path: ["items"],
  });

export type TransferInput = z.infer<typeof transferSchema>;
