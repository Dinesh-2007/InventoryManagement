import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { ReceiptForm } from "@/components/receipts/receipt-form";

export const metadata: Metadata = { title: "New Receipt" };

export default async function NewReceiptPage() {
  const supabase = createClient();

  const [{ data: suppliers }, { data: warehouses }, { data: locations }, { data: products }, { data: profiles }] = await Promise.all([
    supabase.from("suppliers").select("id, name").eq("active", true).order("name"),
    supabase.from("warehouses").select("id, name").eq("active", true).order("name"),
    supabase.from("locations").select("id, name, warehouse_id").eq("active", true).order("name"),
    supabase
      .from("products")
      .select("id, sku, name, unit_of_measure, per_unit_cost")
      .eq("active", true)
      .order("name"),
    supabase.from("profiles").select("id, full_name").order("full_name"),
  ]);

  return (
    <div>
      <PageHeader title="New Receipt" description="Bring incoming stock into a warehouse from a supplier" />
      <ReceiptForm
        suppliers={suppliers ?? []}
        warehouses={warehouses ?? []}
        locations={locations ?? []}
        products={products ?? []}
        profiles={profiles ?? []}
        currentUserId={null}
      />
    </div>
  );
}
