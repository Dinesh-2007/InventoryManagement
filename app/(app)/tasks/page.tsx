import { Suspense } from "react";
import Link from "next/link";
import { requireWarehouseStaff, getCurrentUserAccess } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/format";
import {
  CheckSquare,
  PackageCheck,
  Layers,
  ArrowLeftRight,
  ClipboardCheck,
  ArrowRight,
} from "lucide-react";

export const metadata = { title: "My Tasks — Warehouse Operations" };

export default async function WarehouseTasksPage() {
  await requireWarehouseStaff();
  const access = await getCurrentUserAccess();
  const supabase = createClient();

  const whIds = access.warehouseIds;

  // 1. Fetch pending picking tasks (deliveries ready or waiting)
  let deliveriesQuery = supabase
    .from("deliveries")
    .select("id, reference, scheduled_date, status, customer:customers(name), warehouse:warehouses(name)")
    .in("status", ["ready", "draft", "waiting"])
    .order("scheduled_date", { ascending: true })
    .limit(10);
  if (!access.isManager && whIds.length > 0) {
    deliveriesQuery = deliveriesQuery.in("warehouse_id", whIds);
  }

  // 2. Fetch pending shelving tasks (receipts ready or draft)
  let receiptsQuery = supabase
    .from("receipts")
    .select("id, reference, scheduled_date, status, supplier:suppliers(name), warehouse:warehouses(name)")
    .in("status", ["ready", "draft"])
    .order("scheduled_date", { ascending: true })
    .limit(10);
  if (!access.isManager && whIds.length > 0) {
    receiptsQuery = receiptsQuery.in("warehouse_id", whIds);
  }

  // 3. Fetch pending transfers
  let transfersQuery = supabase
    .from("internal_transfers")
    .select("id, reference, scheduled_date, status, source_warehouse:warehouses!source_warehouse_id(name), dest_warehouse:warehouses!dest_warehouse_id(name)")
    .in("status", ["ready", "draft"])
    .order("scheduled_date", { ascending: true })
    .limit(10);
  if (!access.isManager && whIds.length > 0) {
    transfersQuery = transfersQuery.or(
      `source_warehouse_id.in.(${whIds.join(",")}),dest_warehouse_id.in.(${whIds.join(",")})`
    );
  }

  // 4. Fetch pending counts
  let countsQuery = supabase
    .from("stock_adjustments")
    .select("id, reference, created_at, reason, status, warehouse:warehouses(name), location:locations(name)")
    .eq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(10);
  if (!access.isManager && access.locationIds.length > 0) {
    countsQuery = countsQuery.in("location_id", access.locationIds);
  }

  const [
    { data: deliveries },
    { data: receipts },
    { data: transfers },
    { data: counts },
  ] = await Promise.all([
    deliveriesQuery,
    receiptsQuery,
    transfersQuery,
    countsQuery,
  ]);

  const pickingList = deliveries ?? [];
  const shelvingList = receipts ?? [];
  const transferList = transfers ?? [];
  const countList = counts ?? [];

  const totalTasks = pickingList.length + shelvingList.length + transferList.length + countList.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Tasks"
        description="Prioritized operational tasks assigned to your warehouse and locations"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-sky-500">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <div className="text-xs font-medium text-muted-foreground">Picking Tasks</div>
              <div className="mt-1 text-2xl font-bold">{pickingList.length}</div>
            </div>
            <PackageCheck className="size-6 text-sky-500" />
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <div className="text-xs font-medium text-muted-foreground">Shelving Tasks</div>
              <div className="mt-1 text-2xl font-bold">{shelvingList.length}</div>
            </div>
            <Layers className="size-6 text-emerald-500" />
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-indigo-500">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <div className="text-xs font-medium text-muted-foreground">Transfers to Move</div>
              <div className="mt-1 text-2xl font-bold">{transferList.length}</div>
            </div>
            <ArrowLeftRight className="size-6 text-indigo-500" />
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <div className="text-xs font-medium text-muted-foreground">Stock Counts</div>
              <div className="mt-1 text-2xl font-bold">{countList.length}</div>
            </div>
            <ClipboardCheck className="size-6 text-amber-500" />
          </CardContent>
        </Card>
      </div>

      {totalTasks === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="All caught up!"
          description="There are no pending picking, shelving, or transfer tasks in your assigned warehouse."
        />
      ) : (
        <div className="space-y-6">
          {/* Picking Tasks Table */}
          {pickingList.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <PackageCheck className="size-4 text-sky-600" />
                  <CardTitle className="text-base">Picking & Packing Queue</CardTitle>
                </div>
                <Button size="sm" variant="ghost" render={<Link href="/picking" />} nativeButton={false}>
                  View All Picking <ArrowRight className="ml-1 size-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Scheduled Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pickingList.map((d: any) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-semibold text-primary">{d.reference}</TableCell>
                        <TableCell>{d.customer?.name ?? "—"}</TableCell>
                        <TableCell>{d.warehouse?.name ?? "—"}</TableCell>
                        <TableCell>{formatDate(d.scheduled_date)}</TableCell>
                        <TableCell><StatusBadge status={d.status} /></TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" render={<Link href={`/operations/deliveries/${d.id}`} />} nativeButton={false}>
                            Pick Items
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Shelving Tasks Table */}
          {shelvingList.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="size-4 text-emerald-600" />
                  <CardTitle className="text-base">Shelving & Receiving Queue</CardTitle>
                </div>
                <Button size="sm" variant="ghost" render={<Link href="/shelving" />} nativeButton={false}>
                  View All Shelving <ArrowRight className="ml-1 size-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Scheduled Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shelvingList.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-semibold text-primary">{r.reference}</TableCell>
                        <TableCell>{r.supplier?.name ?? "—"}</TableCell>
                        <TableCell>{r.warehouse?.name ?? "—"}</TableCell>
                        <TableCell>{formatDate(r.scheduled_date)}</TableCell>
                        <TableCell><StatusBadge status={r.status} /></TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" render={<Link href={`/operations/receipts/${r.id}`} />} nativeButton={false}>
                            Shelve
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Transfers Table */}
          {transferList.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="size-4 text-indigo-600" />
                  <CardTitle className="text-base">Internal Transfers Queue</CardTitle>
                </div>
                <Button size="sm" variant="ghost" render={<Link href="/operations/transfers" />} nativeButton={false}>
                  View All Transfers <ArrowRight className="ml-1 size-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>From Warehouse</TableHead>
                      <TableHead>To Warehouse</TableHead>
                      <TableHead>Scheduled Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transferList.map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-semibold text-primary">{t.reference}</TableCell>
                        <TableCell>{t.source_warehouse?.name ?? "—"}</TableCell>
                        <TableCell>{t.dest_warehouse?.name ?? "—"}</TableCell>
                        <TableCell>{formatDate(t.scheduled_date)}</TableCell>
                        <TableCell><StatusBadge status={t.status} /></TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" render={<Link href={`/operations/transfers/${t.id}`} />} nativeButton={false}>
                            Move Stock
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Counts Table */}
          {countList.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="size-4 text-amber-600" />
                  <CardTitle className="text-base">Stock Counting Requests</CardTitle>
                </div>
                <Button size="sm" variant="ghost" render={<Link href="/stock-counting" />} nativeButton={false}>
                  View All Counts <ArrowRight className="ml-1 size-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {countList.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-semibold text-primary">{c.reference}</TableCell>
                        <TableCell>{c.warehouse?.name ?? "—"}</TableCell>
                        <TableCell>{c.location?.name ?? "—"}</TableCell>
                        <TableCell className="capitalize">{c.reason?.replace(/_/g, " ") ?? "Physical Count"}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" render={<Link href={`/stock-counting`} />} nativeButton={false}>
                            Count Now
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
      )}
    </div>
  );
}
