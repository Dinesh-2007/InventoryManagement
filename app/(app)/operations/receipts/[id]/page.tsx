import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Printer } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate, formatDateTime, formatQty } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge, type OperationStatus } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { ReceiptActions } from "@/components/receipts/receipt-actions";

export const metadata: Metadata = { title: "Receipt" };

type ReceiptDetail = {
  id: string;
  reference: string;
  status: OperationStatus;
  scheduled_date: string;
  notes: string | null;
  confirmed_at: string | null;
  done_at: string | null;
  canceled_at: string | null;
  created_at: string;
  supplier: { name: string; contact_person: string | null; phone: string | null; email: string | null } | null;
  warehouse: { name: string } | null;
  location: { name: string } | null;
  responsible: { full_name: string } | null;
  created_by_profile: { full_name: string } | null;
};

type ReceiptItemRow = {
  id: string;
  quantity: number;
  unit_cost: number;
  product: { name: string; sku: string; unit_of_measure: string } | null;
};

type LedgerRow = {
  id: string;
  quantity: number;
  created_at: string;
  product: { name: string; sku: string; unit_of_measure: string } | null;
  location: { name: string } | null;
};

function Timeline({ steps }: { steps: { label: string; at: string | null; reached: boolean }[] }) {
  return (
    <div>
      {steps.map((s, i) => (
        <div key={s.label} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className={cn("size-2.5 rounded-full", s.reached ? "bg-primary" : "bg-muted-foreground/30")} />
            {i < steps.length - 1 && <div className={cn("w-px flex-1", s.reached ? "bg-primary/40" : "bg-border")} style={{ minHeight: 28 }} />}
          </div>
          <div className={cn("pb-5 text-sm", !s.reached && "text-muted-foreground")}>
            <div className="font-medium">{s.label}</div>
            <div className="text-xs text-muted-foreground">{s.at ? formatDateTime(s.at) : "Pending"}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function ReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient();

  const { data, error } = await supabase
    .from("receipts")
    .select(
      `
      id, reference, status, scheduled_date, notes, confirmed_at, done_at, canceled_at, created_at,
      supplier:suppliers(name, contact_person, phone, email),
      warehouse:warehouses(name),
      location:locations(name),
      responsible:profiles!receipts_responsible_id_fkey(full_name),
      created_by_profile:profiles!receipts_created_by_fkey(full_name)
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error) console.error("[receipts:detail]", error);
  if (!data) notFound();

  const receipt = data as unknown as ReceiptDetail;

  const { data: itemRows } = await supabase
    .from("receipt_items")
    .select("id, quantity, unit_cost, product:products(name, sku, unit_of_measure)")
    .eq("receipt_id", id);
  const items = (itemRows ?? []) as unknown as ReceiptItemRow[];
  const total = items.reduce((sum, i) => sum + Number(i.quantity) * Number(i.unit_cost), 0);

  let ledger: LedgerRow[] = [];
  let ledgerUnavailable = false;
  if (receipt.status === "done") {
    const { data: ledgerRows, error: ledgerError } = await supabase
      .from("stock_ledger")
      .select("id, quantity, created_at, product:products(name, sku, unit_of_measure), location:locations!stock_ledger_location_id_fkey(name)")
      .eq("reference_type", "receipt")
      .eq("reference_id", id)
      .order("created_at", { ascending: true });
    if (ledgerError) {
      ledgerUnavailable = true;
    } else {
      ledger = (ledgerRows ?? []) as unknown as LedgerRow[];
    }
  }

  const steps =
    receipt.status === "canceled"
      ? [
          { label: "Created", at: receipt.created_at, reached: true },
          { label: "Canceled", at: receipt.canceled_at, reached: true },
        ]
      : [
          { label: "Created", at: receipt.created_at, reached: true },
          { label: "Confirmed", at: receipt.confirmed_at, reached: !!receipt.confirmed_at },
          { label: "Done", at: receipt.done_at, reached: !!receipt.done_at },
        ];

  return (
    <div>
      <PageHeader
        title={receipt.reference}
        description={receipt.supplier?.name ? `Receipt from ${receipt.supplier.name}` : "Receipt"}
        actions={
          <>
            <Link href={`/print/receipts/${receipt.id}`} target="_blank" className={buttonVariants({ variant: "outline" })}>
              <Printer /> Print
            </Link>
            {(receipt.status === "draft" || receipt.status === "ready") && (
              <ReceiptActions receiptId={receipt.id} status={receipt.status} />
            )}
          </>
        }
      />

      <div className="mb-4">
        <StatusBadge status={receipt.status} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold">Details</h3>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Supplier</dt>
                <dd className="text-sm">{receipt.supplier?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Warehouse / Location</dt>
                <dd className="text-sm">
                  {receipt.warehouse?.name ?? "—"} / {receipt.location?.name ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Schedule Date</dt>
                <dd className="text-sm">{formatDate(receipt.scheduled_date)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Responsible</dt>
                <dd className="text-sm">{receipt.responsible?.full_name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Created By</dt>
                <dd className="text-sm">{receipt.created_by_profile?.full_name ?? "—"}</dd>
              </div>
            </dl>
            {receipt.notes && (
              <div className="mt-3">
                <dt className="text-xs text-muted-foreground">Notes</dt>
                <dd className="text-sm whitespace-pre-wrap">{receipt.notes}</dd>
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold">Products</h3>
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Line Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>{i.product?.name ?? "—"}</TableCell>
                      <TableCell>{i.product?.sku ?? "—"}</TableCell>
                      <TableCell>{formatQty(i.quantity, i.product?.unit_of_measure)}</TableCell>
                      <TableCell>{formatCurrency(i.unit_cost)}</TableCell>
                      <TableCell>{formatCurrency(Number(i.quantity) * Number(i.unit_cost))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-2 flex justify-end text-sm font-semibold">Total: {formatCurrency(total)}</div>
          </div>

          {receipt.status === "done" && (
            <div className="rounded-xl border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold">Stock Impact</h3>
              {ledgerUnavailable ? (
                <p className="text-sm text-muted-foreground">Stock ledger is not available yet.</p>
              ) : ledger.length === 0 ? (
                <p className="text-sm text-muted-foreground">No ledger entries found for this receipt.</p>
              ) : (
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledger.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell>
                            {l.product?.name ?? "—"} {l.product?.sku ? `(${l.product.sku})` : ""}
                          </TableCell>
                          <TableCell className="text-emerald-700">+{formatQty(l.quantity, l.product?.unit_of_measure)}</TableCell>
                          <TableCell>{l.location?.name ?? "—"}</TableCell>
                          <TableCell>{formatDateTime(l.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Status Timeline</h3>
          <Timeline steps={steps} />
        </div>
      </div>
    </div>
  );
}
