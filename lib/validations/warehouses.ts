import { z } from "zod";

const shortCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9][A-Z0-9_-]{0,9}$/, "1–10 characters: letters, numbers, dash or underscore");

export const warehouseSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80, "Max 80 characters"),
  shortCode,
  address: z.string().trim().max(300).optional().or(z.literal("")),
});
export type WarehouseInput = z.infer<typeof warehouseSchema>;

export const locationSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80, "Max 80 characters"),
  shortCode,
  warehouseId: z.uuid("Select a warehouse"),
});
export type LocationInput = z.infer<typeof locationSchema>;
