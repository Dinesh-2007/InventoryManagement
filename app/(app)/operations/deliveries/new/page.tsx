import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { DeliveryForm } from "@/components/deliveries/delivery-form";

export const metadata: Metadata = { title: "New Delivery" };

export default async function NewDeliveryPage() {
  const supabase = createClient();

  const [{ data: customers }, { data: warehouses }, { data: locations }, { data: products }, { data: profiles }] = await Promise.all([
    supabase.from("customers").select("id, name, address").eq("active", true).order("name"),
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
      <PageHeader title="New Delivery" description="Dispatch outgoing stock to a customer" />
      <DeliveryForm
        customers={customers ?? []}
        warehouses={warehouses ?? []}
        locations={locations ?? []}
        products={products ?? []}
        profiles={profiles ?? []}
        currentUserId={null}
      />
    </div>
  );
}
