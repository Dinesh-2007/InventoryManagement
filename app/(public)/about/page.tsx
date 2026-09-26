import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = {
  title: "About",
  description: "What StockSense is, who it's built for, and the stack behind it.",
};

export default function AboutPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="About StockSense"
        description="A modular inventory management system for teams that run real warehouses."
      />

      <Card>
        <CardHeader>
          <CardTitle>What StockSense is</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            StockSense is a modular inventory management system that covers the day-to-day
            operations of running a warehouse: goods receipts from suppliers, deliveries to
            customers, internal transfers between locations, and stock adjustments to correct
            counts after a physical check. Every operation is tracked from draft through
            completion, and every stock movement is recorded in a full audit ledger, so at any
            point you can see not just what is on hand, but exactly how it got there.
          </p>
          <p>
            The system is built around multiple warehouses and locations rather than a single
            flat stock count. Products carry reorder points and reorder quantities so low stock
            is visible before it becomes a problem, and every document — receipt, delivery,
            transfer, or adjustment — gets a system-generated reference number so history stays
            consistent and searchable.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Who it's for</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            StockSense is built for two roles. <strong className="text-foreground">Inventory
            managers</strong> need visibility across products, categories, warehouses, and
            reorder rules, along with reporting on stock movement and value over time.{" "}
            <strong className="text-foreground">Warehouse staff</strong> need a fast, low-friction
            way to process receipts, pick and pack deliveries, move stock between locations, and
            record adjustments — without needing to understand the accounting behind it.
          </p>
          <p>
            Role-based access keeps each group focused on the actions relevant to their job, while
            everyone works from the same live, shared source of truth.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Built with</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
            <li className="rounded-lg border bg-muted/30 px-3 py-2">
              <span className="font-medium text-foreground">Next.js</span> — application framework
              and routing
            </li>
            <li className="rounded-lg border bg-muted/30 px-3 py-2">
              <span className="font-medium text-foreground">Supabase</span> — database,
              authentication, and row-level security
            </li>
            <li className="rounded-lg border bg-muted/30 px-3 py-2">
              <span className="font-medium text-foreground">shadcn/ui</span> — accessible
              component primitives
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
