import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate, formatDateTime, formatQty } from "@/lib/format";
import { Logo } from "@/components/brand/logo";
import { PrintButton } from "@/components/operations/print-styles";

export const metadata: Metadata = { title: "Print Receipt" };

export default async function PrintReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient();

  const { data } = await supabase
    .from("receipts")
    .select(
      `
      id, reference, status, scheduled_date, notes, done_at, created_at,
      supplier:suppliers(name, contact_person, phone, email, address),
      warehouse:warehouses(name),
      location:locations(name),
      responsible:profiles!receipts_responsible_id_fkey(full_name)
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  type Detail = {
    id: string;
    reference: string;
    status: string;
    scheduled_date: string;
    notes: string | null;
    done_at: string | null;
    created_at: string;
    supplier: { name: string; contact_person: string | null; phone: string | null; email: string | null; address: string | null } | null;
    warehouse: { name: string } | null;
    location: { name: string } | null;
    responsible: { full_name: string } | null;
  };
  const receipt = data as unknown as Detail;

  const { data: itemRows } = await supabase
    .from("receipt_items")
    .select("id, quantity, unit_cost, product:products(name, sku, unit_of_measure)")
    .eq("receipt_id", id);
  type Item = { id: string; quantity: number; unit_cost: number; product: { name: string; sku: string; unit_of_measure: string } | null };
  const items = (itemRows ?? []) as unknown as Item[];
  const total = items.reduce((sum, i) => sum + Number(i.quantity) * Number(i.unit_cost), 0);

  return (
    <div className="mx-auto max-w-3xl p-8 print:p-0">
      <div className="mb-6 flex items-center justify-between">
        <Logo />
        <PrintButton />
      </div>

      <div className="mb-6 flex items-start justify-between border-b pb-4">
        <div>
          <h1 className="text-xl font-bold">Goods Receipt Note</h1>
          <p className="text-sm text-muted-foreground">{receipt.reference}</p>
        </div>
        <div className="text-right text-sm">
          <div className="font-medium capitalize">{receipt.status}</div>
          <div className="text-muted-foreground">Scheduled: {formatDate(receipt.scheduled_date)}</div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-6 text-sm">
        <div>
          <div className="mb-1 font-semibold">Supplier</div>
          <div>{receipt.supplier?.name ?? "—"}</div>
          {receipt.supplier?.contact_person && <div>{receipt.supplier.contact_person}</div>}
          {receipt.supplier?.phone && <div>{receipt.supplier.phone}</div>}
          {receipt.supplier?.email && <div>{receipt.supplier.email}</div>}
        </div>
        <div>
          <div className="mb-1 font-semibold">Deliver To</div>
          <div>{receipt.warehouse?.name ?? "—"}</div>
          <div>{receipt.location?.name ?? "—"}</div>
          <div className="mt-2 font-semibold">Responsible</div>
          <div>{receipt.responsible?.full_name ?? "—"}</div>
        </div>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-1.5">Product</th>
            <th className="py-1.5">SKU</th>
            <th className="py-1.5">Quantity</th>
            <th className="py-1.5">Unit Cost</th>
            <th className="py-1.5 text-right">Line Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} className="border-b">
              <td className="py-1.5">{i.product?.name ?? "—"}</td>
              <td className="py-1.5">{i.product?.sku ?? "—"}</td>
              <td className="py-1.5">{formatQty(i.quantity, i.product?.unit_of_measure)}</td>
              <td className="py-1.5">{formatCurrency(i.unit_cost)}</td>
              <td className="py-1.5 text-right">{formatCurrency(Number(i.quantity) * Number(i.unit_cost))}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} className="py-2 text-right font-semibold">
              Total
            </td>
            <td className="py-2 text-right font-semibold">{formatCurrency(total)}</td>
          </tr>
        </tfoot>
      </table>

      {receipt.notes && (
        <div className="mt-4 text-sm">
          <div className="font-semibold">Notes</div>
          <p className="whitespace-pre-wrap text-muted-foreground">{receipt.notes}</p>
        </div>
      )}

      <div className="mt-6 border-t pt-3 text-xs text-muted-foreground">
        Created {formatDateTime(receipt.created_at)}
        {receipt.done_at && <> · Completed {formatDateTime(receipt.done_at)}</>}
      </div>
    </div>
  );
}
