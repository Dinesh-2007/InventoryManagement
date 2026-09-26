import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AlertTriangle, Printer } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDateTime, formatQty } from "@/lib/format";
import { deliveryOperationTypeLabels } from "@/lib/validations/deliveries";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge, type OperationStatus } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { DeliveryActions } from "@/components/deliveries/delivery-actions";

export const metadata: Metadata = { title: "Delivery" };

type DeliveryDetail = {
  id: string;
  reference: string;
  status: OperationStatus;
  scheduled_date: string;
  delivery_address: string;
  operation_type: keyof typeof deliveryOperationTypeLabels;
  notes: string | null;
  confirmed_at: string | null;
  done_at: string | null;
  canceled_at: string | null;
  created_at: string;
  customer: { name: string; contact_person: string | null; phone: string | null; email: string | null } | null;
  warehouse: { name: string } | null;
  location: { name: string } | null;
  responsible: { full_name: string } | null;
  created_by_profile: { full_name: string } | null;
};

type DeliveryItemRow = {
  id: string;
  quantity: number;
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

export default async function DeliveryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("deliveries")
    .select(
      `
      id, reference, status, scheduled_date, delivery_address, operation_type, notes,
      confirmed_at, done_at, canceled_at, created_at,
      customer:customers(name, contact_person, phone, email),
      warehouse:warehouses(name),
      location:locations(name),
      responsible:profiles!deliveries_responsible_id_fkey(full_name),
      created_by_profile:profiles!deliveries_created_by_fkey(full_name)
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error) console.error("[deliveries:detail]", error);
  if (!data) notFound();

  const delivery = data as unknown as DeliveryDetail;

  const { data: itemRows } = await supabase
    .from("delivery_items")
    .select("id, quantity, product:products(name, sku, unit_of_measure)")
    .eq("delivery_id", id);
  const items = (itemRows ?? []) as unknown as DeliveryItemRow[];

  let ledger: LedgerRow[] = [];
  let ledgerUnavailable = false;
  if (delivery.status === "done") {
    const { data: ledgerRows, error: ledgerError } = await supabase
      .from("stock_ledger")
      .select("id, quantity, created_at, product:products(name, sku, unit_of_measure), location:locations!stock_ledger_location_id_fkey(name)")
      .eq("reference_type", "delivery")
      .eq("reference_id", id)
      .order("created_at", { ascending: true });
    if (ledgerError) {
      ledgerUnavailable = true;
    } else {
      ledger = (ledgerRows ?? []) as unknown as LedgerRow[];
    }
  }

  const steps =
    delivery.status === "canceled"
      ? [
          { label: "Created", at: delivery.created_at, reached: true },
          { label: "Canceled", at: delivery.canceled_at, reached: true },
        ]
      : [
          { label: "Created", at: delivery.created_at, reached: true },
          { label: "Confirmed", at: delivery.confirmed_at, reached: !!delivery.confirmed_at },
          { label: "Done", at: delivery.done_at, reached: !!delivery.done_at },
        ];

  return (
    <div>
      <PageHeader
        title={delivery.reference}
        description={delivery.customer?.name ? `Delivery to ${delivery.customer.name}` : "Delivery"}
        actions={
          <>
            <Link href={`/print/deliveries/${delivery.id}`} target="_blank" className={buttonVariants({ variant: "outline" })}>
              <Printer /> Print
            </Link>
            {delivery.status !== "done" && delivery.status !== "canceled" && <DeliveryActions deliveryId={delivery.id} status={delivery.status} />}
          </>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <StatusBadge status={delivery.status} />
        <span className="text-sm text-muted-foreground">{deliveryOperationTypeLabels[delivery.operation_type] ?? delivery.operation_type}</span>
      </div>

      {delivery.status === "waiting" && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>Waiting for stock — some items don&apos;t have enough free-to-use quantity at the source location yet.</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold">Details</h3>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Customer</dt>
                <dd className="text-sm">{delivery.customer?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Delivery Address</dt>
                <dd className="text-sm whitespace-pre-wrap">{delivery.delivery_address}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Warehouse / Location</dt>
                <dd className="text-sm">
                  {delivery.warehouse?.name ?? "—"} / {delivery.location?.name ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Schedule Date</dt>
                <dd className="text-sm">{formatDate(delivery.scheduled_date)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Responsible</dt>
                <dd className="text-sm">{delivery.responsible?.full_name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Created By</dt>
                <dd className="text-sm">{delivery.created_by_profile?.full_name ?? "—"}</dd>
              </div>
            </dl>
            {delivery.notes && (
              <div className="mt-3">
                <dt className="text-xs text-muted-foreground">Notes</dt>
                <dd className="text-sm whitespace-pre-wrap">{delivery.notes}</dd>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>{i.product?.name ?? "—"}</TableCell>
                      <TableCell>{i.product?.sku ?? "—"}</TableCell>
                      <TableCell>{formatQty(i.quantity, i.product?.unit_of_measure)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {delivery.status === "done" && (
            <div className="rounded-xl border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold">Stock Impact</h3>
              {ledgerUnavailable ? (
                <p className="text-sm text-muted-foreground">Stock ledger is not available yet.</p>
              ) : ledger.length === 0 ? (
                <p className="text-sm text-muted-foreground">No ledger entries found for this delivery.</p>
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
                          <TableCell className="text-destructive">-{formatQty(Math.abs(Number(l.quantity)), l.product?.unit_of_measure)}</TableCell>
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
