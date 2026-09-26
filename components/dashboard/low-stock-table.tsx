import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatQty } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";

type Row = { product_id: string; name: string; sku: string; unit_of_measure: string; free_to_use: number | string; reorder_point: number | string; active: boolean };

export async function LowStockTable() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("stock_overview")
    .select("product_id,name,sku,unit_of_measure,free_to_use,reorder_point,active")
    .eq("active", true);
  if (error) console.error("[dashboard] stock_overview unavailable for low stock table", error);

  const rows = ((error ? [] : data ?? []) as Row[])
    .filter((r) => Number(r.free_to_use) <= Number(r.reorder_point))
    .sort((a, b) => Number(a.free_to_use) - Number(b.free_to_use))
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Low Stock Products</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState icon={AlertTriangle} title="No low stock products" description="Every active product is above its reorder point." />
        ) : (
          <ul className="divide-y">
            {rows.map((r) => (
              <li key={r.product_id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <Link href={`/products/${r.product_id}`} className="font-medium hover:underline">{r.name}</Link>
                  <div className="text-xs text-muted-foreground">{r.sku}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className={Number(r.free_to_use) <= 0 ? "font-medium text-rose-600" : "font-medium text-amber-600"}>
                    {formatQty(r.free_to_use, r.unit_of_measure)}
                  </div>
                  <div className="text-xs text-muted-foreground">Reorder at {formatQty(r.reorder_point, r.unit_of_measure)}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
