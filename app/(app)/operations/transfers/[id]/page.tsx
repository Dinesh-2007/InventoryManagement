import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Circle, FileEdit } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDateTime, formatQty } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TransferActions } from "@/components/transfers/transfer-actions";
import { cn } from "@/lib/utils";

export default async function TransferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: transfer, error } = await supabase
    .from("internal_transfers")
    .select(
      "id,reference,status,scheduled_date,notes,created_at,confirmed_at,done_at,canceled_at," +
        "source_warehouse:warehouses!internal_transfers_source_warehouse_id_fkey(name)," +
        "source_location:locations!internal_transfers_source_location_id_source_warehouse_id_fkey(name)," +
        "dest_warehouse:warehouses!internal_transfers_dest_warehouse_id_fkey(name)," +
        "dest_location:locations!internal_transfers_dest_location_id_dest_warehouse_id_fkey(name)," +
        "responsible:profiles!internal_transfers_responsible_id_fkey(full_name)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) console.error("[transfer detail]", error);
  if (!transfer) notFound();

  const { data: items } = await supabase
    .from("internal_transfer_items")
    .select("id,quantity,product:products(name,sku,unit_of_measure)")
    .eq("transfer_id", id);

  // stock_ledger is owned by the DB agent's parallel migration; select defensively
  // so this page still renders if it hasn't landed yet.
  let ledgerRows: { id: string; quantity: number; product?: { name: string } | null; from_loc?: { name: string } | null; to_loc?: { name: string } | null }[] = [];
  let ledgerUnavailable = false;
  if (transfer.status === "done") {
    const { data: ledger, error: ledgerError } = await supabase
      .from("stock_ledger")
      .select("id,quantity,product:products(name),from_loc:locations!stock_ledger_from_location_id_fkey(name),to_loc:locations!stock_ledger_to_location_id_fkey(name)")
      .eq("reference_type", "transfer")
      .eq("reference_id", id);
    if (ledgerError) {
      console.error("[transfer detail] stock_ledger unavailable", ledgerError);
      ledgerUnavailable = true;
    } else {
      ledgerRows = ledger ?? [];
    }
  }

  const steps = [
    { label: "Created", done: true, at: transfer.created_at },
    { label: "Confirmed", done: !!transfer.confirmed_at || transfer.status === "done", at: transfer.confirmed_at },
    { label: "Done", done: !!transfer.done_at, at: transfer.done_at },
  ];

  return (
    <div>
      <div className="mb-2">
        <Link href="/operations/transfers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to Transfers
        </Link>
      </div>
      <PageHeader
        title={transfer.reference}
        description="Internal Transfer"
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge status={transfer.status} />
            <TransferActions id={transfer.id} status={transfer.status} />
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border bg-card p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-xs font-medium text-muted-foreground">Source</div>
                <div className="mt-1 font-medium">{transfer.source_warehouse?.name}</div>
                <div className="text-sm text-muted-foreground">{transfer.source_location?.name}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">Destination</div>
                <div className="mt-1 font-medium">{transfer.dest_warehouse?.name}</div>
                <div className="text-sm text-muted-foreground">{transfer.dest_location?.name}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">Schedule Date</div>
                <div className="mt-1">{formatDate(transfer.scheduled_date)}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">Responsible</div>
                <div className="mt-1">{transfer.responsible?.full_name ?? "Unassigned"}</div>
              </div>
              {transfer.notes && (
                <div className="sm:col-span-2">
                  <div className="text-xs font-medium text-muted-foreground">Notes</div>
                  <div className="mt-1 text-sm">{transfer.notes}</div>
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
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(items ?? []).map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>{it.product?.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{it.product?.sku ?? "—"}</TableCell>
                    <TableCell className="text-right">{formatQty(it.quantity, it.product?.unit_of_measure)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {transfer.status === "done" && (
            <div className="rounded-xl border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold">Stock Impact</h3>
              {ledgerUnavailable ? (
                <p className="text-sm text-muted-foreground">Stock ledger is not available yet.</p>
              ) : ledgerRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No ledger rows recorded for this transfer.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {ledgerRows.map((r) => (
                    <li key={r.id} className="flex items-center gap-2">
                      <span className="font-medium">{r.product?.name ?? "Product"}</span>
                      <span className="text-muted-foreground">
                        {formatQty(r.quantity)} moved from <span className="font-medium text-foreground">{r.from_loc?.name ?? "—"}</span> to{" "}
                        <span className="font-medium text-foreground">{r.to_loc?.name ?? "—"}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4">
          <h3 className="mb-4 text-sm font-semibold">Timeline</h3>
          <ol className="space-y-4">
            {steps.map((s, i) => (
              <li key={s.label} className="flex gap-3">
                <div className="flex flex-col items-center">
                  {s.done ? <CheckCircle2 className="size-5 text-primary" /> : <Circle className="size-5 text-muted-foreground" />}
                  {i < steps.length - 1 && <div className={cn("mt-1 h-6 w-px", s.done ? "bg-primary" : "bg-border")} />}
                </div>
                <div>
                  <div className={cn("text-sm font-medium", !s.done && "text-muted-foreground")}>{s.label}</div>
                  {s.at && <div className="text-xs text-muted-foreground">{formatDateTime(s.at)}</div>}
                </div>
              </li>
            ))}
            {transfer.status === "canceled" && (
              <li className="flex items-center gap-3 text-rose-600">
                <FileEdit className="size-5" />
                <div className="text-sm font-medium">Canceled {transfer.canceled_at && `· ${formatDateTime(transfer.canceled_at)}`}</div>
              </li>
            )}
          </ol>
        </div>
      </div>
    </div>
  );
}
