import { Suspense } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { UrlSearchInput } from "@/components/shared/url-search-input";
import { UrlSelect } from "@/components/shared/url-select";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { ProductsTable } from "@/components/products/products-table";

export const metadata = { title: "Products | StockSense" };

type SearchParams = { q?: string; category?: string; stock?: string; sort?: string; page?: string };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const supabase = createClient();
  const { data: categories, error } = await supabase.from("product_categories").select("id,name").eq("active", true).order("name");
  if (error) console.error("[products] categories query failed", error.message);

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage your inventory products"
        actions={
          <Link href="/products/new">
            <Button>New Product</Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <UrlSearchInput placeholder="Search products or SKU..." />
        <UrlSelect
          param="category"
          label="Category"
          allLabel="All Categories"
          options={(categories ?? []).map((c) => ({ value: c.id, label: c.name }))}
        />
        <UrlSelect
          param="stock"
          label="Stock status"
          allLabel="All Stock Statuses"
          options={[
            { value: "in_stock", label: "In Stock" },
            { value: "low_stock", label: "Low Stock" },
            { value: "out_of_stock", label: "Out of Stock" },
          ]}
        />
      </div>

      <Suspense key={JSON.stringify(sp)} fallback={<TableSkeleton cols={8} />}>
        <ProductsTable searchParams={sp} />
      </Suspense>
    </div>
  );
}
