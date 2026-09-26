import type { Metadata } from "next";
import { LayoutDashboard } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = { title: "Dashboard" };

// Placeholder — replace with the real dashboard (KPIs, charts, recent activity).
export default function DashboardPage() {
  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of your inventory operations" />
      <div className="rounded-xl border bg-card">
        <EmptyState
          icon={LayoutDashboard}
          title="Dashboard coming soon"
          description="KPIs, stock levels, and recent activity will appear here."
        />
      </div>
    </div>
  );
}
