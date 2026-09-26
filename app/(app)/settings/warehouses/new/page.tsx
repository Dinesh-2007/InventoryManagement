import { PageHeader } from "@/components/shared/page-header";
import { WarehouseForm } from "@/components/settings/warehouse-form";

export default function NewWarehousePage() {
  return (
    <div>
      <PageHeader title="New Warehouse" description="Add a new warehouse" />
      <WarehouseForm />
    </div>
  );
}
