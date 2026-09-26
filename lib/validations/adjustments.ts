import { z } from "zod";

/** `initial_stock` is system-only (booked at product creation) and is never offered here. */
export const ADJUSTMENT_REASONS = [
  { value: "physical_count", label: "Physical count correction" },
  { value: "damaged", label: "Damaged" },
  { value: "lost", label: "Lost" },
  { value: "found", label: "Found" },
  { value: "data_correction", label: "Data correction" },
  { value: "other", label: "Other" },
] as const;

/** Display label for every reason value, including the system-only `initial_stock` used on read views. */
export const ADJUSTMENT_REASON_LABELS: Record<string, string> = {
  initial_stock: "Initial Stock",
  ...Object.fromEntries(ADJUSTMENT_REASONS.map((r) => [r.value, r.label])),
};

export const adjustmentReasonEnum = z.enum([
  "physical_count", "damaged", "lost", "found", "data_correction", "other",
]);

export const adjustmentLineSchema = z.object({
  productId: z.uuid(),
  countedQuantity: z.number().min(0, "Must be 0 or greater"),
});

export const adjustmentSchema = z
  .object({
    warehouseId: z.uuid("Select a warehouse"),
    locationId: z.uuid("Select a location"),
    reason: adjustmentReasonEnum,
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
    items: z.array(adjustmentLineSchema).min(1, "Add at least one product"),
  })
  .refine((v) => new Set(v.items.map((i) => i.productId)).size === v.items.length, {
    message: "Each product can only appear once. Remove the duplicate line.",
    path: ["items"],
  });

export type AdjustmentInput = z.infer<typeof adjustmentSchema>;
