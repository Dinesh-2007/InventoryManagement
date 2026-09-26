import { Suspense } from "react";
import { requireWarehouseStaff } from "@/lib/auth/server";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { WarehouseKpiRow } from "@/components/dashboard/warehouse/warehouse-kpi-row";
import { AssignedScopeCard } from "@/components/dashboard/warehouse/assigned-scope-card";
import { TodayReceiptsCard, TodayDeliveriesCard } from "@/components/dashboard/warehouse/today-operations-card";
import { WarehouseActivity } from "@/components/dashboard/warehouse/warehouse-activity";

export const metadata = { title: "Warehouse Staff Dashboard" };

function CardSkeleton({ className = "h-48" }: { className?: string }) {
  return (
    <div className={`rounded-xl border bg-card p-4 ${className}`}>
      <Skeleton className="h-full w-full" />
    </div>
  );
}

export default async function WarehouseDashboardPage() {
  await requireWarehouseStaff();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouse Operations"
        description="Floor-level execution, tasks, and operational activity"
      />

      {/* Scope banner showing assigned warehouses and locations */}
      <Suspense fallback={<CardSkeleton className="h-28" />}>
        <AssignedScopeCard />
      </Suspense>

      {/* Operational KPI row */}
      <Suspense
        fallback={
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} className="h-24" />
            ))}
          </div>
        }
      >
        <WarehouseKpiRow />
      </Suspense>

      {/* Today's Receipts & Deliveries */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Suspense fallback={<CardSkeleton className="h-44" />}>
          <TodayReceiptsCard />
        </Suspense>
        <Suspense fallback={<CardSkeleton className="h-44" />}>
          <TodayDeliveriesCard />
        </Suspense>
      </div>

      {/* Recent Warehouse Activity */}
      <Suspense fallback={<CardSkeleton className="h-64" />}>
        <WarehouseActivity />
      </Suspense>
    </div>
  );
}
