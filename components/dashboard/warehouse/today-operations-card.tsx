import { PackageCheck, Truck, Layers, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/server";
import { businessToday } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { safeCount } from "@/components/dashboard/safe-count";

export async function TodayReceiptsCard() {
  const access = await getCurrentUserAccess();
  const supabase = createClient();
  const today = businessToday();

  let toReceiveQuery = supabase
    .from("receipts")
    .select("id", { count: "exact", head: true })
    .in("status", ["draft", "ready"]);
  if (!access.isManager) toReceiveQuery = toReceiveQuery.in("warehouse_id", access.warehouseIds);

  let todayQuery = supabase
    .from("receipts")
    .select("id", { count: "exact", head: true })
    .eq("scheduled_date", today)
    .not("status", "in", "(done,canceled)");
  if (!access.isManager) todayQuery = todayQuery.in("warehouse_id", access.warehouseIds);

  let readyQuery = supabase
    .from("receipts")
    .select("id", { count: "exact", head: true })
    .eq("status", "ready");
  if (!access.isManager) readyQuery = readyQuery.in("warehouse_id", access.warehouseIds);

  const [toReceive, scheduledToday, readyToShelve] = await Promise.all([
    safeCount(toReceiveQuery),
    safeCount(todayQuery),
    safeCount(readyQuery),
  ]);

  return (
    <Card className="flex flex-col justify-between">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <Layers className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Today's Receipts</CardTitle>
              <p className="text-xs text-muted-foreground">Inbound shipments arriving at your facilities</p>
            </div>
          </div>
          <Button size="sm" variant="outline" render={<Link href="/shelving" />} nativeButton={false}>
            Start Shelving
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/30 p-3 text-center">
          <div>
            <div className="text-xs text-muted-foreground">Ready to Shelve</div>
            <div className="mt-1 text-xl font-bold text-emerald-600">{readyToShelve}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Due Today</div>
            <div className="mt-1 text-xl font-bold">{scheduledToday}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Total Pending</div>
            <div className="mt-1 text-xl font-bold">{toReceive}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export async function TodayDeliveriesCard() {
  const access = await getCurrentUserAccess();
  const supabase = createClient();
  const today = businessToday();

  let toDeliverQuery = supabase
    .from("deliveries")
    .select("id", { count: "exact", head: true })
    .in("status", ["draft", "ready"]);
  if (!access.isManager) toDeliverQuery = toDeliverQuery.in("warehouse_id", access.warehouseIds);

  let todayQuery = supabase
    .from("deliveries")
    .select("id", { count: "exact", head: true })
    .eq("scheduled_date", today)
    .not("status", "in", "(done,canceled)");
  if (!access.isManager) todayQuery = todayQuery.in("warehouse_id", access.warehouseIds);

  let readyQuery = supabase
    .from("deliveries")
    .select("id", { count: "exact", head: true })
    .eq("status", "ready");
  if (!access.isManager) readyQuery = readyQuery.in("warehouse_id", access.warehouseIds);

  const [toDeliver, scheduledToday, readyToPick] = await Promise.all([
    safeCount(toDeliverQuery),
    safeCount(todayQuery),
    safeCount(readyQuery),
  ]);

  return (
    <Card className="flex flex-col justify-between">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-sky-500/10 p-2 text-sky-600 dark:text-sky-400">
              <PackageCheck className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Today's Deliveries</CardTitle>
              <p className="text-xs text-muted-foreground">Outbound orders to pick, pack and dispatch</p>
            </div>
          </div>
          <Button size="sm" variant="outline" render={<Link href="/picking" />} nativeButton={false}>
            Start Picking
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/30 p-3 text-center">
          <div>
            <div className="text-xs text-muted-foreground">Ready to Pick</div>
            <div className="mt-1 text-xl font-bold text-sky-600">{readyToPick}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Due Today</div>
            <div className="mt-1 text-xl font-bold">{scheduledToday}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Total Pending</div>
            <div className="mt-1 text-xl font-bold">{toDeliver}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
