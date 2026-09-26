import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { LocationForm } from "@/components/settings/location-form";

export default async function EditLocationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: location }, { data: warehouses }] = await Promise.all([
    supabase.from("locations").select("id,name,short_code,warehouse_id").eq("id", id).maybeSingle(),
    supabase.from("warehouses").select("id,name").order("name"),
  ]);
  if (!location) notFound();

  return (
    <div>
      <PageHeader title="Edit Location" description={location.name} />
      <LocationForm warehouses={warehouses ?? []} location={location} />
    </div>
  );
}
