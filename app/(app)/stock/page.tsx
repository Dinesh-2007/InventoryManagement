import { Suspense } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { UrlSearchInput } from "@/components/shared/url-search-input";
import { UrlSelect } from "@/components/shared/url-select";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { StockContent } from "@/components/stock/stock-content";

export const metadata = { title: "Stock | StockSense" };

type SearchParams = { q?: string; category?: string };

export default async function StockPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const supabase = createClient();
  const { data: categories, error } = await supabase.from("product_categories").select("id,name").eq("active", true).order("name");
  if (error) console.error("[stock] categories query failed", error.message);

  return (
    <div>
      <PageHeader
        title="Stock"
        description="Current on-hand and free-to-use quantities across all locations"
        actions={
          <Link href="/operations/adjustments/new">
            <Button>Update Stock</Button>
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
      </div>

      <Suspense key={JSON.stringify(sp)} fallback={<TableSkeleton cols={6} />}>
        <StockContent searchParams={sp} />
      </Suspense>
    </div>
  );
}
