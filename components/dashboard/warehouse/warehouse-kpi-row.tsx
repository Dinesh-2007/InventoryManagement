import {
  CheckSquare,
  PackageCheck,
  Layers,
  ArrowLeftRight,
  ClipboardCheck,
  Clock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/server";
import { KpiCard } from "@/components/dashboard/kpi-card";

export async function WarehouseKpiRow() {
  const access = await getCurrentUserAccess();
  const supabase = createClient();

  const whIds = access.warehouseIds;
  const locIds = access.locationIds;

  // If user has no assigned warehouses/locations, return zeroes
  if (!access.isManager && (whIds.length === 0 || locIds.length === 0)) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Tasks Today" value={0} href="/tasks" icon={CheckSquare} />
        <KpiCard label="Picking" value={0} href="/picking" icon={PackageCheck} />
        <KpiCard label="Shelving" value={0} href="/shelving" icon={Layers} />
        <KpiCard label="Internal Transfers" value={0} href="/operations/transfers" icon={ArrowLeftRight} />
        <KpiCard label="Stock Counts" value={0} href="/stock-counting" icon={ClipboardCheck} />
        <KpiCard label="Waiting Tasks" value={0} href="/tasks" icon={Clock} />
      </div>
    );
  }

  // 1. Picking: Deliveries ready for picking
  let pickingQuery = supabase
    .from("deliveries")
    .select("id", { count: "exact", head: true })
    .in("status", ["ready", "draft"]);
  if (!access.isManager) {
    pickingQuery = pickingQuery.in("warehouse_id", whIds);
  }

  // 2. Shelving: Receipts ready for shelving
  let shelvingQuery = supabase
    .from("receipts")
    .select("id", { count: "exact", head: true })
    .in("status", ["ready", "draft"]);
  if (!access.isManager) {
    shelvingQuery = shelvingQuery.in("warehouse_id", whIds);
  }

  // 3. Internal Transfers: Ready transfers
  let transfersQuery = supabase
    .from("internal_transfers")
    .select("id", { count: "exact", head: true })
    .in("status", ["ready", "draft"]);
  if (!access.isManager) {
    transfersQuery = transfersQuery.or(
      `source_warehouse_id.in.(${whIds.join(",")}),dest_warehouse_id.in.(${whIds.join(",")})`
    );
  }

  // 4. Stock Counts: Draft adjustments
  let countsQuery = supabase
    .from("stock_adjustments")
    .select("id", { count: "exact", head: true })
    .eq("status", "draft");
  if (!access.isManager) {
    countsQuery = countsQuery.in("location_id", locIds);
  }

  // 5. Waiting Tasks: draft operations waiting for confirmation/arrival
  let waitingReceipts = supabase
    .from("receipts")
    .select("id", { count: "exact", head: true })
    .eq("status", "draft");
  if (!access.isManager) waitingReceipts = waitingReceipts.in("warehouse_id", whIds);

  let waitingDeliveries = supabase
    .from("deliveries")
    .select("id", { count: "exact", head: true })
    .eq("status", "draft");
  if (!access.isManager) waitingDeliveries = waitingDeliveries.in("warehouse_id", whIds);

  const [
    { count: pickingCount },
    { count: shelvingCount },
    { count: transfersCount },
    { count: countsCount },
    { count: waitReceiptsCount },
    { count: waitDeliveriesCount },
  ] = await Promise.all([
    pickingQuery,
    shelvingQuery,
    transfersQuery,
    countsQuery,
    waitingReceipts,
    waitingDeliveries,
  ]);

  const picking = pickingCount ?? 0;
  const shelving = shelvingCount ?? 0;
  const transfers = transfersCount ?? 0;
  const counts = countsCount ?? 0;
  const waitingTasks = (waitReceiptsCount ?? 0) + (waitDeliveriesCount ?? 0);
  const tasksToday = picking + shelving + transfers + counts;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <KpiCard
        label="Tasks Today"
        value={tasksToday}
        href="/tasks"
        icon={CheckSquare}
        tone={tasksToday > 10 ? "warning" : "default"}
      />
      <KpiCard
        label="Picking"
        value={picking}
        href="/picking"
        icon={PackageCheck}
        tone={picking > 0 ? "warning" : "default"}
      />
      <KpiCard
        label="Shelving"
        value={shelving}
        href="/shelving"
        icon={Layers}
        tone={shelving > 0 ? "default" : "default"}
      />
      <KpiCard
        label="Internal Transfers"
        value={transfers}
        href="/operations/transfers"
        icon={ArrowLeftRight}
        tone="default"
      />
      <KpiCard
        label="Stock Counts"
        value={counts}
        href="/stock-counting"
        icon={ClipboardCheck}
        tone="default"
      />
      <KpiCard
        label="Waiting Tasks"
        value={waitingTasks}
        href="/tasks"
        icon={Clock}
        tone={waitingTasks > 5 ? "warning" : "default"}
      />
    </div>
  );
}
