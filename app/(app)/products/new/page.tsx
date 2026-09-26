import { PageHeader } from "@/components/shared/page-header";
import { ProductForm, type CategoryOption, type LocationOption } from "@/components/products/product-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "New Product | StockSense" };

async function loadOptions() {
  const supabase = await createClient();

  const [categoriesRes, locationsRes] = await Promise.all([
    supabase.from("product_categories").select("id,name").eq("active", true).order("name"),
    supabase.from("locations").select("id,name,short_code,warehouse_id,warehouses(name)").eq("active", true).order("name"),
  ]);

  if (categoriesRes.error) console.error("[products/new] categories query failed", categoriesRes.error.message);
  if (locationsRes.error) console.error("[products/new] locations query failed", locationsRes.error.message);

  const categories: CategoryOption[] = (categoriesRes.data ?? []).map((c) => ({ id: c.id, name: c.name }));

  const locations: LocationOption[] = (locationsRes.data ?? []).map((l) => {
    const wh = l.warehouses as { name: string } | { name: string }[] | null;
    const warehouseName = Array.isArray(wh) ? wh[0]?.name : wh?.name;
    return { id: l.id, label: warehouseName ? `${warehouseName} — ${l.name}` : l.name };
  });

  return { categories, locations };
}

export default async function NewProductPage() {
  const { categories, locations } = await loadOptions();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New Product" description="Add a product to your catalog" />
      <div className="rounded-xl border bg-card p-5">
        <ProductForm mode="create" categories={categories} locations={locations} />
      </div>
    </div>
  );
}
