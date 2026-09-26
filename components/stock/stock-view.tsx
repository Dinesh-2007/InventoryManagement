"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { StockStatusBadge } from "@/components/shared/status-badge";
import { ViewToggle, useViewMode } from "@/components/shared/view-toggle";
import { formatCurrency, formatQty } from "@/lib/format";
import { deriveStockStatus, type StockOverviewRow } from "@/components/stock/stock-status";

export function StockView({
  rows,
  categoryNames,
  hasFilters,
}: {
  rows: StockOverviewRow[];
  categoryNames: Map<string, string>;
  hasFilters: boolean;
}) {
  const [mode, setMode] = useViewMode("stock");

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border bg-card">
        <EmptyState
          title="No products found"
          description={hasFilters ? "Try a different search or filter." : "Add products to start tracking stock."}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ViewToggle mode={mode} onChange={setMode} />
      </div>

      {mode === "list" ? (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Per Unit Cost</TableHead>
                <TableHead className="text-right">On Hand</TableHead>
                <TableHead className="text-right">Free to Use</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.product_id}>
                  <TableCell>
                    <Link href={`/products/${r.product_id}`} className="font-medium hover:underline">
                      {r.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {r.sku} · {categoryNames.get(r.category_id) ?? "—"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(r.per_unit_cost)}</TableCell>
                  <TableCell className="text-right">{formatQty(r.on_hand, r.unit_of_measure)}</TableCell>
                  <TableCell className="text-right">{formatQty(r.free_to_use, r.unit_of_measure)}</TableCell>
                  <TableCell>
                    <StockStatusBadge status={deriveStockStatus(r)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/products/${r.product_id}`}
                      aria-label={`By location — ${r.name}`}
                      className="inline-flex items-center gap-0.5 text-sm text-muted-foreground hover:text-foreground"
                    >
                      By location <ChevronRight className="size-3.5" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <div key={r.product_id} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/products/${r.product_id}`} className="font-medium hover:underline">
                    {r.name}
                  </Link>
                  <div className="truncate text-xs text-muted-foreground">{r.sku}</div>
                </div>
                <StockStatusBadge status={deriveStockStatus(r)} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Cost</div>
                  <div>{formatCurrency(r.per_unit_cost)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">On Hand</div>
                  <div>{formatQty(r.on_hand, r.unit_of_measure)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Free</div>
                  <div>{formatQty(r.free_to_use, r.unit_of_measure)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
