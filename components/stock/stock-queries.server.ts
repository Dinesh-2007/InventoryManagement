import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { StockOverviewRow, StockByLocationRow } from "@/components/stock/stock-status";

/**
 * Server-side query helpers for the `stock_overview` / `stock_by_location`
 * views (supabase/migrations/20260926000600_stock_view.sql), used by both the
 * Products pages and the Stock page.
 *
 * These views depend on `inventory_balances` / `stock_ledger`, which are owned
 * by the DB agent and may not have landed yet — every query here degrades to
 * an empty result (and logs) instead of throwing, so pages render an empty
 * state rather than crashing mid-build.
 *
 * Pure types/helpers (safe to import from client components too) live in
 * `stock-status.ts` and are re-exported here for convenience.
 */
export type { StockOverviewRow, StockByLocationRow } from "@/components/stock/stock-status";
export { deriveStockStatus } from "@/components/stock/stock-status";

/** Fetches the whole (search/category-filtered) stock overview; status filtering and pagination happen in JS since they're derived. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchStockOverview(supabase: SupabaseClient<any, any, any>, opts: { search?: string; categoryId?: string } = {}): Promise<StockOverviewRow[]> {
  let query = supabase.from("stock_overview").select("*");
  if (opts.search) query = query.or(`name.ilike.%${opts.search}%,sku.ilike.%${opts.search}%`);
  if (opts.categoryId) query = query.eq("category_id", opts.categoryId);
  const { data, error } = await query.order("name");
  if (error) {
    console.error("[stock_overview] query failed (has the inventory_balances migration landed yet?)", error.message);
    return [];
  }
  return (data ?? []) as StockOverviewRow[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchStockByLocation(supabase: SupabaseClient<any, any, any>, productId: string): Promise<StockByLocationRow[]> {
  const { data, error } = await supabase.from("stock_by_location").select("*").eq("product_id", productId).order("warehouse_name");
  if (error) {
    console.error("[stock_by_location] query failed (has the inventory_balances migration landed yet?)", error.message);
    return [];
  }
  return (data ?? []) as StockByLocationRow[];
}
