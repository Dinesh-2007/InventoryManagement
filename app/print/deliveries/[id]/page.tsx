import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDateTime, formatQty } from "@/lib/format";
import { deliveryOperationTypeLabels } from "@/lib/validations/deliveries";
import { Logo } from "@/components/brand/logo";
import { PrintButton } from "@/components/operations/print-styles";

export const metadata: Metadata = { title: "Print Delivery" };

export default async function PrintDeliveryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("deliveries")
    .select(
      `
      id, reference, status, scheduled_date, delivery_address, operation_type, notes, done_at, created_at,
      customer:customers(name, contact_person, phone, email),
      warehouse:warehouses(name),
      location:locations(name),
      responsible:profiles!deliveries_responsible_id_fkey(full_name)
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
    delivery_address: string;
    operation_type: keyof typeof deliveryOperationTypeLabels;
    notes: string | null;
    done_at: string | null;
    created_at: string;
    customer: { name: string; contact_person: string | null; phone: string | null; email: string | null } | null;
    warehouse: { name: string } | null;
    location: { name: string } | null;
    responsible: { full_name: string } | null;
  };
  const delivery = data as unknown as Detail;

  const { data: itemRows } = await supabase
    .from("delivery_items")
    .select("id, quantity, product:products(name, sku, unit_of_measure)")
    .eq("delivery_id", id);
  type Item = { id: string; quantity: number; product: { name: string; sku: string; unit_of_measure: string } | null };
  const items = (itemRows ?? []) as unknown as Item[];

  return (
    <div className="mx-auto max-w-3xl p-8 print:p-0">
      <div className="mb-6 flex items-center justify-between">
        <Logo />
        <PrintButton />
      </div>

      <div className="mb-6 flex items-start justify-between border-b pb-4">
        <div>
          <h1 className="text-xl font-bold">Delivery Note</h1>
          <p className="text-sm text-muted-foreground">{delivery.reference}</p>
        </div>
        <div className="text-right text-sm">
          <div className="font-medium capitalize">{delivery.status}</div>
          <div className="text-muted-foreground">Scheduled: {formatDate(delivery.scheduled_date)}</div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-6 text-sm">
        <div>
          <div className="mb-1 font-semibold">Deliver To</div>
          <div>{delivery.customer?.name ?? "—"}</div>
          <div className="whitespace-pre-wrap">{delivery.delivery_address}</div>
          {delivery.customer?.phone && <div>{delivery.customer.phone}</div>}
        </div>
        <div>
          <div className="mb-1 font-semibold">Dispatch From</div>
          <div>{delivery.warehouse?.name ?? "—"}</div>
          <div>{delivery.location?.name ?? "—"}</div>
          <div className="mt-2 font-semibold">Operation Type</div>
          <div>{deliveryOperationTypeLabels[delivery.operation_type] ?? delivery.operation_type}</div>
          <div className="mt-2 font-semibold">Responsible</div>
          <div>{delivery.responsible?.full_name ?? "—"}</div>
        </div>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-1.5">Product</th>
            <th className="py-1.5">SKU</th>
            <th className="py-1.5 text-right">Quantity</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} className="border-b">
              <td className="py-1.5">{i.product?.name ?? "—"}</td>
              <td className="py-1.5">{i.product?.sku ?? "—"}</td>
              <td className="py-1.5 text-right">{formatQty(i.quantity, i.product?.unit_of_measure)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {delivery.notes && (
        <div className="mt-4 text-sm">
          <div className="font-semibold">Notes</div>
          <p className="whitespace-pre-wrap text-muted-foreground">{delivery.notes}</p>
        </div>
      )}

      <div className="mt-6 border-t pt-3 text-xs text-muted-foreground">
        Created {formatDateTime(delivery.created_at)}
        {delivery.done_at && <> · Completed {formatDateTime(delivery.done_at)}</>}
      </div>
    </div>
  );
}
