import { PackageSearch } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReorderRuleDialog } from "@/components/products/reorder-rule-dialog";
import { createClient } from "@/lib/supabase/server";
import { fetchStockOverview } from "@/components/stock/stock-queries.server";
import { formatQty } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Reorder Rules | StockSense" };

export default async function ReorderRulesPage() {
  const supabase = await createClient();
  const [rows, categoriesRes] = await Promise.all([
    fetchStockOverview(supabase),
    supabase.from("product_categories").select("id,name"),
  ]);

  if (categoriesRes.error) console.error("[products/reorder-rules] categories query failed", categoriesRes.error.message);
  const categoryNames = new Map((categoriesRes.data ?? []).map((c) => [c.id, c.name] as const));

  const active = rows.filter((r) => r.active);
  const sorted = [...active].sort((a, b) => {
    const aBelow = a.free_to_use <= a.reorder_point ? 1 : 0;
    const bBelow = b.free_to_use <= b.reorder_point ? 1 : 0;
    if (aBelow !== bBelow) return bBelow - aBelow;
    return a.name.localeCompare(b.name);
  });

  return (
    <div>
      <PageHeader title="Reorder Rules" description="Products at or below their reorder point are highlighted and listed first" />

      <div className="rounded-xl border bg-card">
        {sorted.length === 0 ? (
          <EmptyState icon={PackageSearch} title="No active products" description="Active products will appear here with their reorder rules." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Free to Use</TableHead>
                <TableHead className="text-right">Reorder Point</TableHead>
                <TableHead className="text-right">Reorder Quantity</TableHead>
                <TableHead className="text-right">Suggested Replenishment</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((r) => {
                const below = r.free_to_use <= r.reorder_point;
                return (
                  <TableRow key={r.product_id} className={cn(below && "bg-rose-50/60 hover:bg-rose-50")}>
                    <TableCell>
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.sku}</div>
                    </TableCell>
                    <TableCell>{categoryNames.get(r.category_id) ?? "—"}</TableCell>
                    <TableCell className="text-right">{formatQty(r.free_to_use, r.unit_of_measure)}</TableCell>
                    <TableCell className="text-right">{formatQty(r.reorder_point, r.unit_of_measure)}</TableCell>
                    <TableCell className="text-right">{formatQty(r.reorder_quantity, r.unit_of_measure)}</TableCell>
                    <TableCell className="text-right">{below ? formatQty(r.reorder_quantity, r.unit_of_measure) : "—"}</TableCell>
                    <TableCell className="text-right">
                      <ReorderRuleDialog
                        productId={r.product_id}
                        productName={r.name}
                        reorderPoint={r.reorder_point}
                        reorderQuantity={r.reorder_quantity}
                        unitOfMeasure={r.unit_of_measure}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
