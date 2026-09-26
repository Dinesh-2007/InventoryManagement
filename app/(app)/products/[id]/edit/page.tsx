import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ProductForm, type CategoryOption } from "@/components/products/product-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Edit Product | StockSense" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [productRes, categoriesRes] = await Promise.all([
    supabase
      .from("products")
      .select("id,name,sku,category_id,unit_of_measure,per_unit_cost,reorder_point,reorder_quantity,description")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("product_categories").select("id,name").eq("active", true).order("name"),
  ]);

  if (productRes.error) console.error("[products/edit] product query failed", productRes.error.message);
  if (!productRes.data) notFound();

  const categories: CategoryOption[] = (categoriesRes.data ?? []).map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Edit Product" description={productRes.data.name} />
      <div className="rounded-xl border bg-card p-5">
        <ProductForm mode="edit" product={productRes.data} categories={categories} locations={[]} />
      </div>
    </div>
  );
}
