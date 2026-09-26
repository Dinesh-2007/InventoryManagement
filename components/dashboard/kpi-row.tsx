import { Package, AlertTriangle, PackageX, Inbox, Truck, ArrowLeftRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { safeCount } from "./safe-count";
import { KpiCard } from "./kpi-card";

type StockRow = { free_to_use: number | string; reorder_point: number | string; active: boolean };

export async function KpiRow() {
  const supabase = createClient();

  const [totalProducts, pendingReceipts, pendingDeliveries, transfersScheduled, stockResult] = await Promise.all([
    safeCount(supabase.from("products").select("id", { count: "exact", head: true }).eq("active", true)),
    safeCount(supabase.from("receipts").select("id", { count: "exact", head: true }).in("status", ["draft", "ready"])),
    safeCount(supabase.from("deliveries").select("id", { count: "exact", head: true }).in("status", ["draft", "waiting", "ready"])),
    safeCount(supabase.from("internal_transfers").select("id", { count: "exact", head: true }).in("status", ["draft", "ready"])),
    supabase.from("stock_overview").select("free_to_use,reorder_point,active"),
  ]);

  if (stockResult.error) console.error("[dashboard] stock_overview unavailable for KPIs", stockResult.error);
  const stockRows = ((stockResult.data ?? []) as StockRow[]).filter((r) => r.active);
  const lowStock = stockRows.filter((r) => Number(r.free_to_use) > 0 && Number(r.free_to_use) <= Number(r.reorder_point)).length;
  const outOfStock = stockRows.filter((r) => Number(r.free_to_use) <= 0).length;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <KpiCard label="Total Products" value={totalProducts} href="/products" icon={Package} />
      <KpiCard label="Low Stock Items" value={lowStock} href="/products?stock=low_stock" icon={AlertTriangle} tone="warning" />
      <KpiCard label="Out of Stock" value={outOfStock} href="/products?stock=out_of_stock" icon={PackageX} tone="destructive" />
      <KpiCard label="Pending Receipts" value={pendingReceipts} href="/operations/receipts?status=ready" icon={Inbox} />
      <KpiCard label="Pending Deliveries" value={pendingDeliveries} href="/operations/deliveries?status=ready" icon={Truck} />
      <KpiCard label="Transfers Scheduled" value={transfersScheduled} href="/operations/transfers?status=ready" icon={ArrowLeftRight} />
    </div>
  );
}
