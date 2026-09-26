import { Suspense } from "react";
import Link from "next/link";
import { requireWarehouseStaff, getCurrentUserAccess } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/format";
import { ClipboardCheck, Plus, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Stock Counting — Warehouse Operations" };

export default async function StockCountingPage() {
  await requireWarehouseStaff();
  const access = await getCurrentUserAccess();
  const supabase = createClient();

  let query = supabase
    .from("stock_adjustments")
    .select("id, reference, created_at, reason, status, notes, warehouse:warehouses(name), location:locations(name)")
    .order("created_at", { ascending: false });

  if (!access.isManager && access.locationIds.length > 0) {
    query = query.in("location_id", access.locationIds);
  }

  const { data: counts, error } = await query;
  if (error) console.error("[stock-counting] query error", error);
  const rows = counts ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Counting"
        description="Conduct physical cycle counts and submit discrepancy reports for your assigned locations"
        actions={
          <Button render={<Link href="/stock-counting/new" />} nativeButton={false}>
            <Plus className="mr-1 size-4" /> New Physical Count
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No stock counts recorded"
          description="Start a physical cycle count to verify on-shelf inventory against system records."
          actions={
            <Button render={<Link href="/stock-counting/new" />} nativeButton={false}>
              <Plus className="mr-1 size-4" /> Start Physical Count
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Date Logged</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-semibold text-primary">
                      {row.reference}
                    </TableCell>
                    <TableCell>{row.warehouse?.name ?? "—"}</TableCell>
                    <TableCell>{row.location?.name ?? "—"}</TableCell>
                    <TableCell className="capitalize">
                      {row.reason?.replace(/_/g, " ") ?? "Physical Count"}
                    </TableCell>
                    <TableCell>{formatDate(row.created_at)}</TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        render={<Link href={`/operations/adjustments/${row.id}`} />}
                        nativeButton={false}
                      >
                        <Eye className="mr-1 size-3.5" /> View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
