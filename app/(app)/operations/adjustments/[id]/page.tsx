import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatQty } from "@/lib/format";
import { ADJUSTMENT_REASON_LABELS } from "@/lib/validations/adjustments";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdjustmentActions } from "@/components/adjustments/adjustment-actions";
import { cn } from "@/lib/utils";

type AdjustmentDetail = {
  id: string;
  reference: string;
  status: "draft" | "done" | "canceled";
  reason: string;
  notes: string | null;
  created_at: string;
  done_at: string | null;
  canceled_at: string | null;
  warehouse: { name: string } | null;
  location: { name: string } | null;
  responsible: { full_name: string } | null;
};

type AdjustmentItemRow = {
  id: string;
  counted_quantity: number;
  system_quantity: number | null;
  difference: number | null;
  product: { name: string; sku: string; unit_of_measure: string } | null;
};

type LedgerRow = { id: string; quantity: number; product: { name: string } | null; from_loc: { name: string } | null; to_loc: { name: string } | null };

export default async function AdjustmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: adjustment, error } = await supabase
    .from("stock_adjustments")
    .select(
      "id,reference,status,reason,notes,created_at,done_at,canceled_at," +
        "warehouse:warehouses!stock_adjustments_warehouse_id_fkey(name)," +
        "location:locations!stock_adjustments_location_id_warehouse_id_fkey(name)," +
        "responsible:profiles!stock_adjustments_responsible_id_fkey(full_name)",
    )
    .eq("id", id)
    .returns<AdjustmentDetail[]>()
    .maybeSingle();
  if (error) console.error("[adjustment detail]", error);
  if (!adjustment) notFound();

  const { data: items } = await supabase
    .from("stock_adjustment_items")
    .select("id,counted_quantity,system_quantity,difference,product:products(name,sku,unit_of_measure)")
    .eq("adjustment_id", id)
    .returns<AdjustmentItemRow[]>();

  // stock_ledger is owned by the DB agent's parallel migration; select defensively.
  let ledgerRows: LedgerRow[] = [];
  let ledgerUnavailable = false;
  if (adjustment.status === "done") {
    const { data: ledger, error: ledgerError } = await supabase
      .from("stock_ledger")
      .select("id,quantity,product:products(name),from_loc:locations!stock_ledger_from_location_id_fkey(name),to_loc:locations!stock_ledger_to_location_id_fkey(name)")
      .eq("reference_type", "stock_adjustment")
      .eq("reference_id", id)
      .returns<LedgerRow[]>();
    if (ledgerError) {
      console.error("[adjustment detail] stock_ledger unavailable", ledgerError);
      ledgerUnavailable = true;
    } else {
      ledgerRows = ledger ?? [];
    }
  }

  return (
    <div>
      <div className="mb-2">
        <Link href="/operations/adjustments" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to Adjustments
        </Link>
      </div>
      <PageHeader
        title={adjustment.reference}
        description="Stock Adjustment"
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge status={adjustment.status} />
            <AdjustmentActions id={adjustment.id} status={adjustment.status} />
          </div>
        }
      />

      <div className="space-y-4">
        <div className="rounded-xl border bg-card p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-xs font-medium text-muted-foreground">Warehouse / Location</div>
              <div className="mt-1 font-medium">{adjustment.warehouse?.name}</div>
              <div className="text-sm text-muted-foreground">{adjustment.location?.name}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">Reason</div>
              <div className="mt-1">{ADJUSTMENT_REASON_LABELS[adjustment.reason] ?? adjustment.reason}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">Responsible</div>
              <div className="mt-1">{adjustment.responsible?.full_name ?? "Unassigned"}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">
                {adjustment.status === "done" ? "Applied" : adjustment.status === "canceled" ? "Canceled" : "Created"}
              </div>
              <div className="mt-1">{formatDateTime(adjustment.done_at ?? adjustment.canceled_at ?? adjustment.created_at)}</div>
            </div>
            {adjustment.notes && (
              <div className="sm:col-span-2 lg:col-span-4">
                <div className="text-xs font-medium text-muted-foreground">Notes</div>
                <div className="mt-1 text-sm">{adjustment.notes}</div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Products</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>System Qty</TableHead>
                <TableHead>Physical Count</TableHead>
                <TableHead>Difference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(items ?? []).map((it) => {
                const diff = it.difference == null ? null : Number(it.difference);
                return (
                  <TableRow key={it.id}>
                    <TableCell>
                      <div>{it.product?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{it.product?.sku}</div>
                    </TableCell>
                    <TableCell>{it.system_quantity == null ? "—" : formatQty(it.system_quantity, it.product?.unit_of_measure)}</TableCell>
                    <TableCell>{formatQty(it.counted_quantity, it.product?.unit_of_measure)}</TableCell>
                    <TableCell className={cn("font-medium", diff == null || diff === 0 ? "text-muted-foreground" : diff > 0 ? "text-emerald-600" : "text-rose-600")}>
                      {diff == null ? "—" : `${diff > 0 ? "+" : ""}${formatQty(diff, it.product?.unit_of_measure)}`}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {adjustment.status === "done" && (
          <div className="rounded-xl border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold">Stock Impact</h3>
            {ledgerUnavailable ? (
              <p className="text-sm text-muted-foreground">Stock ledger is not available yet.</p>
            ) : ledgerRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No ledger rows recorded for this adjustment.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {ledgerRows.map((r) => (
                  <li key={r.id} className="flex items-center gap-2">
                    <span className="font-medium">{r.product?.name ?? "Product"}</span>
                    <span className={cn("font-medium", r.quantity >= 0 ? "text-emerald-600" : "text-rose-600")}>
                      {r.quantity >= 0 ? "+" : ""}
                      {formatQty(r.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
