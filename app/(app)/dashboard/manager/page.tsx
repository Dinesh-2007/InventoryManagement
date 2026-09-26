import { Suspense } from "react";
import { requireManager } from "@/lib/auth/server";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiRow } from "@/components/dashboard/kpi-row";
import { ReceiptsCard } from "@/components/dashboard/receipts-card";
import { DeliveriesCard } from "@/components/dashboard/deliveries-card";
import { StockDonutSection } from "@/components/dashboard/stock-donut-section";
import { RecentMovements } from "@/components/dashboard/recent-movements";
import { LowStockTable } from "@/components/dashboard/low-stock-table";
import { UpcomingOperations } from "@/components/dashboard/upcoming-operations";

export const metadata = { title: "Manager Dashboard" };

function CardSkeleton({ className = "h-64" }: { className?: string }) {
  return (
    <div className={`rounded-xl border bg-card p-4 ${className}`}>
      <Skeleton className="h-full w-full" />
    </div>
  );
}

export default async function ManagerDashboardPage() {
  await requireManager();

  return (
    <div className="space-y-6">
      <PageHeader title="Manager Dashboard" description="Company-wide inventory overview and operations" />

      <Suspense
        fallback={
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} className="h-24" />
            ))}
          </div>
        }
      >
        <KpiRow />
      </Suspense>

      <div className="grid gap-4 lg:grid-cols-2">
        <Suspense fallback={<CardSkeleton className="h-48" />}>
          <ReceiptsCard />
        </Suspense>
        <Suspense fallback={<CardSkeleton className="h-48" />}>
          <DeliveriesCard />
        </Suspense>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Suspense fallback={<CardSkeleton />}>
          <StockDonutSection />
        </Suspense>
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          <Suspense fallback={<CardSkeleton />}>
            <RecentMovements />
          </Suspense>
          <Suspense fallback={<CardSkeleton />}>
            <LowStockTable />
          </Suspense>
        </div>
      </div>

      <Suspense fallback={<CardSkeleton />}>
        <UpcomingOperations />
      </Suspense>
    </div>
  );
}
