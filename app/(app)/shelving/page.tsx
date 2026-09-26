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
import { Layers, ArrowRight, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Shelving Operations — Warehouse Staff" };

export default async function ShelvingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireWarehouseStaff();
  const access = await getCurrentUserAccess();
  const sp = await searchParams;
  const statusFilter = sp.status ?? "ready";

  const supabase = createClient();
  let query = supabase
    .from("receipts")
    .select("id, reference, scheduled_date, status, supplier:suppliers(name), warehouse:warehouses(name), location:locations(name)")
    .order("scheduled_date", { ascending: true });

  if (!access.isManager && access.warehouseIds.length > 0) {
    query = query.in("warehouse_id", access.warehouseIds);
  }

  if (statusFilter === "ready") {
    query = query.eq("status", "ready");
  } else if (statusFilter === "all_active") {
    query = query.in("status", ["ready", "draft"]);
  } else if (statusFilter === "done") {
    query = query.eq("status", "done").limit(30);
  }

  const { data: receipts, error } = await query;
  if (error) console.error("[shelving] query error", error);
  const rows = receipts ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shelving & Putaway"
        description="Receive incoming shipments and shelve products into their designated warehouse locations"
      />

      {/* Status tabs */}
      <div className="flex gap-2 border-b pb-3">
        <Button
          size="sm"
          variant={statusFilter === "ready" ? "default" : "outline"}
          render={<Link href="/shelving?status=ready" />}
          nativeButton={false}
        >
          Ready to Shelve
        </Button>
        <Button
          size="sm"
          variant={statusFilter === "all_active" ? "default" : "outline"}
          render={<Link href="/shelving?status=all_active" />}
          nativeButton={false}
        >
          All Active
        </Button>
        <Button
          size="sm"
          variant={statusFilter === "done" ? "default" : "outline"}
          render={<Link href="/shelving?status=done" />}
          nativeButton={false}
        >
          Completed
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No receipts to shelve"
          description={
            statusFilter === "ready"
              ? "There are currently no inbound shipments ready for putaway in your assigned warehouse."
              : "No receipts match the selected filter."
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Target Location</TableHead>
                  <TableHead>Scheduled Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-semibold text-primary">
                      {row.reference}
                    </TableCell>
                    <TableCell>{row.supplier?.name ?? "—"}</TableCell>
                    <TableCell>{row.warehouse?.name ?? "—"}</TableCell>
                    <TableCell>{row.location?.name ?? "—"}</TableCell>
                    <TableCell>{formatDate(row.scheduled_date)}</TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant={row.status === "ready" ? "default" : "outline"}
                          render={<Link href={`/operations/receipts/${row.id}`} />}
                          nativeButton={false}
                        >
                          {row.status === "ready" ? (
                            <>
                              Shelve Items <ArrowRight className="ml-1 size-3.5" />
                            </>
                          ) : (
                            <>
                              <Eye className="mr-1 size-3.5" /> View
                            </>
                          )}
                        </Button>
                      </div>
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
