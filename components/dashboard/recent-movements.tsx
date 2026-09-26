import Link from "next/link";
import { History } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatQty } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";

const TYPE_LABEL: Record<string, string> = { receipt: "Receipt", delivery: "Delivery", transfer: "Transfer", stock_adjustment: "Adjustment" };

function referenceHref(type: string, id: string) {
  switch (type) {
    case "receipt": return `/operations/receipts/${id}`;
    case "delivery": return `/operations/deliveries/${id}`;
    case "transfer": return `/operations/transfers/${id}`;
    case "stock_adjustment": return `/operations/adjustments/${id}`;
    default: return "#";
  }
}

type Row = { id: string; reference: string | null; reference_type: string; reference_id: string; product_name: string; quantity: number; created_at: string };

export async function RecentMovements() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("move_history_view").select("*").order("created_at", { ascending: false }).limit(8);
  if (error) console.error("[dashboard] move_history_view unavailable for recent movements", error);
  const rows = (error ? [] : (data ?? [])) as Row[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Movements</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState
            icon={History}
            title="No recent movements"
            description={error ? "Move history is not available yet." : "Stock movements will appear here."}
          />
        ) : (
          <ul className="divide-y">
            {rows.map((r) => {
              const rawQty = Number(r.quantity);
              const sign = r.reference_type === "transfer" ? 0 : r.reference_type === "delivery" ? -1 : r.reference_type === "receipt" ? 1 : rawQty >= 0 ? 1 : -1;
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <Link href={referenceHref(r.reference_type, r.reference_id)} className="font-medium text-primary hover:underline">
                      {r.reference ?? TYPE_LABEL[r.reference_type] ?? r.reference_type}
                    </Link>
                    <div className="truncate text-xs text-muted-foreground">{r.product_name}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className={sign > 0 ? "font-medium text-emerald-600" : sign < 0 ? "font-medium text-rose-600" : "font-medium"}>
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
