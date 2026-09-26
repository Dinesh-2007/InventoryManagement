import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { AdjustmentForm } from "@/components/adjustments/adjustment-form";

import { requireManager } from "@/lib/auth/server";

export default async function NewAdjustmentPage() {
  await requireManager();
  const supabase = createClient();
  const [{ data: warehouses }, { data: locations }, { data: products }] = await Promise.all([
    supabase.from("warehouses").select("id,name,short_code").eq("active", true).order("name"),
    supabase.from("locations").select("id,name,short_code,warehouse_id").eq("active", true).order("name"),
    supabase.from("products").select("id,name,sku,unit_of_measure").eq("active", true).order("name"),
  ]);

  return (
    <div>
      <PageHeader title="New Adjustment" description="Correct system stock against a physical count" />
      <AdjustmentForm warehouses={warehouses ?? []} locations={locations ?? []} products={products ?? []} />
    </div>
  );
}
