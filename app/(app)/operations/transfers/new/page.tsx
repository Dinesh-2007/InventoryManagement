import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { TransferForm } from "@/components/transfers/transfer-form";

export default async function NewTransferPage() {
  const supabase = await createClient();
  const [{ data: warehouses }, { data: locations }, { data: products }, { data: profiles }, { data: auth }] = await Promise.all([
    supabase.from("warehouses").select("id,name,short_code").eq("active", true).order("name"),
    supabase.from("locations").select("id,name,short_code,warehouse_id").eq("active", true).order("name"),
    supabase.from("products").select("id,name,sku,unit_of_measure").eq("active", true).order("name"),
    supabase.from("profiles").select("id,full_name").order("full_name"),
    supabase.auth.getUser(),
  ]);

  return (
    <div>
      <PageHeader title="New Transfer" description="Move stock between warehouses and locations" />
      <TransferForm
        warehouses={warehouses ?? []}
        locations={locations ?? []}
        products={products ?? []}
        profiles={profiles ?? []}
        currentUserId={auth?.user?.id ?? null}
      />
    </div>
  );
}
