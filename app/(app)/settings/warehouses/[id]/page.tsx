import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { WarehouseForm } from "@/components/settings/warehouse-form";

export default async function EditWarehousePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient();
  const { data: warehouse } = await supabase.from("warehouses").select("id,name,short_code,address").eq("id", id).maybeSingle();
  if (!warehouse) notFound();

  return (
    <div>
      <PageHeader title="Edit Warehouse" description={warehouse.name} />
      <WarehouseForm warehouse={warehouse} />
    </div>
  );
}
