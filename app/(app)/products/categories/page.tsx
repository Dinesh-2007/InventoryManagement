import { Tags } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { UrlSearchInput } from "@/components/shared/url-search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { ActiveBadge } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CategoryDialog } from "@/components/products/category-dialog";
import { CategoryRowActions } from "@/components/products/category-row-actions";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSearch } from "@/lib/format";

export const metadata = { title: "Categories | StockSense" };

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q: rawQ } = await searchParams;
  const q = sanitizeSearch(rawQ);
  const supabase = createClient();

  let categoriesQuery = supabase.from("product_categories").select("id,name,description,active").order("name");
  if (q) categoriesQuery = categoriesQuery.ilike("name", `%${q}%`);

  const [categoriesRes, productsRes] = await Promise.all([
    categoriesQuery,
    supabase.from("products").select("category_id"),
  ]);

  if (categoriesRes.error) console.error("[products/categories] categories query failed", categoriesRes.error.message);
  if (productsRes.error) console.error("[products/categories] products count query failed", productsRes.error.message);

  const counts = new Map<string, number>();
  for (const p of productsRes.data ?? []) {
    counts.set(p.category_id, (counts.get(p.category_id) ?? 0) + 1);
  }

  const categories = categoriesRes.data ?? [];

  return (
    <div>
      <PageHeader title="Categories" description="Group products for filtering and reporting" actions={<CategoryDialog mode="create" />} />

      <div className="mb-4">
        <UrlSearchInput placeholder="Search categories..." />
      </div>

      <div className="rounded-xl border bg-card">
        {categories.length === 0 ? (
          <EmptyState
            icon={Tags}
            title="No categories found"
            description={q ? "Try a different search term." : "Create your first category to start organizing products."}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Products</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="max-w-sm truncate text-muted-foreground">{c.description || "—"}</TableCell>
                  <TableCell className="text-right">{counts.get(c.id) ?? 0}</TableCell>
                  <TableCell>
                    <ActiveBadge active={c.active} />
                  </TableCell>
                  <TableCell className="text-right">
                    <CategoryRowActions category={c} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
