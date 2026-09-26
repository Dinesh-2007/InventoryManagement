import { requireWarehouseStaff, getCurrentUserAccess } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { AdjustmentForm } from "@/components/adjustments/adjustment-form";

export const metadata = { title: "Submit Physical Count — Warehouse Staff" };

export default async function NewStockCountPage() {
  await requireWarehouseStaff();
  const access = await getCurrentUserAccess();
  const supabase = createClient();

  let whQuery = supabase.from("warehouses").select("id,name,short_code").eq("active", true).order("name");
  let locQuery = supabase.from("locations").select("id,name,short_code,warehouse_id").eq("active", true).order("name");

  if (!access.isManager) {
    if (access.warehouseIds.length > 0) whQuery = whQuery.in("id", access.warehouseIds);
    if (access.locationIds.length > 0) locQuery = locQuery.in("id", access.locationIds);
  }

  const [{ data: warehouses }, { data: locations }, { data: products }] = await Promise.all([
    whQuery,
    locQuery,
    supabase.from("products").select("id,name,sku,unit_of_measure").eq("active", true).order("name"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Physical Stock Count"
        description="Enter verified rack quantities. The count will be submitted as a draft for manager review and approval."
      />
      <AdjustmentForm
        warehouses={warehouses ?? []}
        locations={locations ?? []}
        products={products ?? []}
      />
    </div>
  );
}
