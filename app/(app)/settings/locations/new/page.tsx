import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { LocationForm } from "@/components/settings/location-form";

export default async function NewLocationPage() {
  const supabase = createClient();
  const { data: warehouses } = await supabase.from("warehouses").select("id,name").eq("active", true).order("name");

  return (
    <div>
      <PageHeader title="New Location" description="Add a new location inside a warehouse" />
      <LocationForm warehouses={warehouses ?? []} />
    </div>
  );
}
