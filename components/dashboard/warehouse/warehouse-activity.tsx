import Link from "next/link";
import { History, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/server";
import { formatDateTime, formatQty } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

const TYPE_LABEL: Record<string, string> = {
  receipt: "Receipt",
  delivery: "Delivery",
  transfer: "Transfer",
  stock_adjustment: "Adjustment",
};

function referenceHref(type: string, id: string) {
  switch (type) {
    case "receipt":
      return `/shelving`;
    case "delivery":
      return `/picking`;
    case "transfer":
      return `/operations/transfers/${id}`;
    case "stock_adjustment":
      return `/stock-counting`;
    default:
      return "#";
  }
}

type Row = {
  id: string;
  reference: string | null;
  reference_type: string;
  reference_id: string;
  product_name: string;
  quantity: number;
  warehouse_name: string | null;
  from_location_name: string | null;
  to_location_name: string | null;
  created_at: string;
};

export async function WarehouseActivity() {
  const access = await getCurrentUserAccess();
  const supabase = createClient();

  let query = supabase
    .from("move_history_view")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(8);

  if (!access.isManager && access.warehouseIds.length > 0) {
    query = query.in("warehouse_id", access.warehouseIds);
  }

  const { data, error } = await query;
  if (error) console.error("[dashboard] warehouse activity query error", error);
  const rows = (error ? [] : (data ?? [])) as Row[];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-semibold">Recent Warehouse Activity</CardTitle>
          <p className="text-xs text-muted-foreground">Recent movements logged across your assigned locations</p>
        </div>
        <Button size="sm" variant="ghost" render={<Link href="/move-history" />} nativeButton={false}>
          View History <ArrowRight className="ml-1 size-3.5" />
        </Button>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState
            icon={History}
            title="No recent activity"
            description="Recent material transfers and physical movements in your assigned areas will appear here."
          />
        ) : (
          <ul className="divide-y">
            {rows.map((r) => {
              const rawQty = Number(r.quantity);
              const sign =
                r.reference_type === "transfer"
                  ? 0
                  : r.reference_type === "delivery"
                  ? -1
                  : r.reference_type === "receipt"
                  ? 1
                  : rawQty >= 0
                  ? 1
                  : -1;

              return (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <Link
                      href={referenceHref(r.reference_type, r.reference_id)}
                      className="font-medium text-primary hover:underline"
                    >
                      {r.reference ?? TYPE_LABEL[r.reference_type] ?? r.reference_type}
                    </Link>
                    <div className="truncate text-xs text-foreground font-normal">
                      {r.product_name}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {r.from_location_name && r.to_location_name
                        ? `${r.from_location_name} → ${r.to_location_name}`
                        : r.to_location_name
                        ? `To: ${r.to_location_name}`
                        : r.from_location_name
                        ? `From: ${r.from_location_name}`
                        : r.warehouse_name ?? ""}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div
                      className={
                        sign > 0
                          ? "font-semibold text-emerald-600"
                          : sign < 0
                          ? "font-semibold text-rose-600"
                          : "font-semibold"
                      }
                    >
                      {sign > 0 ? "+" : sign < 0 ? "-" : ""}
                      {formatQty(Math.abs(rawQty))}
                    </div>
                    <div className="text-xs text-muted-foreground">{formatDateTime(r.created_at)}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
