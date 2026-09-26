import { z } from "zod";

export const skuRegex = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,39}$/;

export const productSchema = z
  .object({
    name: z.string().trim().min(1, "Product name is required").max(120),
    sku: z
      .string()
      .trim()
      .regex(skuRegex, "1–40 characters: letters, numbers, dot, dash, underscore or slash, starting with a letter or number")
      .transform((v) => v.toUpperCase()),
    category_id: z.uuid("Select a category"),
    unit_of_measure: z.string().trim().min(1, "Unit of measure is required").max(20),
    per_unit_cost: z.coerce.number().min(0, "Must be 0 or more"),
    reorder_point: z.coerce.number().min(0, "Must be 0 or more"),
    reorder_quantity: z.coerce.number().min(0, "Must be 0 or more"),
    initial_stock: z.coerce.number().min(0, "Must be 0 or more").optional().default(0),
    initial_location_id: z.uuid().optional().or(z.literal("")).optional(),
    description: z.string().trim().max(1000).optional().or(z.literal("")),
  })
  .refine((v) => !(v.initial_stock && v.initial_stock > 0) || !!v.initial_location_id, {
    path: ["initial_location_id"],
    message: "Select a location to book the initial stock",
  });

export type ProductInput = z.infer<typeof productSchema>;

/** Update never touches initial_stock/initial_location_id (booked once at creation). */
export const productUpdateSchema = z.object({
  name: z.string().trim().min(1, "Product name is required").max(120),
  sku: z
    .string()
    .trim()
    .regex(skuRegex, "1–40 characters: letters, numbers, dot, dash, underscore or slash, starting with a letter or number")
    .transform((v) => v.toUpperCase()),
  category_id: z.uuid("Select a category"),
  unit_of_measure: z.string().trim().min(1, "Unit of measure is required").max(20),
  per_unit_cost: z.coerce.number().min(0, "Must be 0 or more"),
  reorder_point: z.coerce.number().min(0, "Must be 0 or more"),
  reorder_quantity: z.coerce.number().min(0, "Must be 0 or more"),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

/** Reorder-rule-only edit (reorder-rules page). */
export const reorderRuleSchema = z.object({
  reorder_point: z.coerce.number().min(0, "Must be 0 or more"),
  reorder_quantity: z.coerce.number().min(0, "Must be 0 or more"),
});

export type ReorderRuleInput = z.infer<typeof reorderRuleSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(80),
  description: z.string().trim().max(500).optional().or(z.literal("")),
});

export type CategoryInput = z.infer<typeof categorySchema>;
