/**
 * Pure types/helpers shared by server AND client stock components. Kept
 * separate from stock-queries.server.ts (which imports `server-only`) so
 * client components (e.g. the Stock page's grid/list view) can import
 * `deriveStockStatus` without pulling a server-only module into the bundle.
 */

export type StockOverviewRow = {
  product_id: string;
  name: string;
  sku: string;
  category_id: string;
  unit_of_measure: string;
  per_unit_cost: number;
  reorder_point: number;
  reorder_quantity: number;
  active: boolean;
  on_hand: number;
  free_to_use: number;
};

export type StockByLocationRow = {
  product_id: string;
  location_id: string;
  location_name: string;
  warehouse_name: string;
  quantity_on_hand: number;
};

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock" | "inactive";

export function deriveStockStatus(row: { active: boolean; free_to_use: number; reorder_point: number }): StockStatus {
  if (!row.active) return "inactive";
  if (row.free_to_use <= 0) return "out_of_stock";
  if (row.free_to_use <= row.reorder_point) return "low_stock";
  return "in_stock";
}
