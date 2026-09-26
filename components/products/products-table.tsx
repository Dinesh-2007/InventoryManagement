import Link from "next/link";
import { PackagePlus } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { StockStatusBadge } from "@/components/shared/status-badge";
import { PaginationBar, parsePage } from "@/components/shared/pagination-bar";
import { Button } from "@/components/ui/button";
import { formatQty, sanitizeSearch } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { deriveStockStatus, fetchStockOverview } from "@/components/stock/stock-queries.server";
import { ProductRowActions } from "@/components/products/product-row-actions";

const PAGE_SIZE = 20;

type SearchParams = { q?: string; category?: string; stock?: string; sort?: string; page?: string };

export async function ProductsTable({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();
  const q = sanitizeSearch(searchParams.q);
  const categoryId = searchParams.category || undefined;
  const stockFilter = searchParams.stock || undefined;
  const page = parsePage(searchParams.page);

  const [rows, categoriesRes] = await Promise.all([
    fetchStockOverview(supabase, { search: q || undefined, categoryId }),
    supabase.from("product_categories").select("id,name"),
  ]);

  const categoryNames = new Map((categoriesRes.data ?? []).map((c) => [c.id, c.name] as const));

  const filtered = stockFilter
    ? rows.filter((r) => deriveStockStatus(r) === stockFilter)
    : rows;

  const total = filtered.length;
  const from = (page - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(from, from + PAGE_SIZE);

  const hasAnyFilter = Boolean(q || categoryId || stockFilter);

  if (total === 0) {
    return (
      <div className="rounded-xl border bg-card">
        <EmptyState
          icon={PackagePlus}
          title="No products found"
          description="Create your first product to start tracking inventory."
          actions={
            <>
              <Link href="/products/new"><Button>Create Product</Button></Link>
              {hasAnyFilter && (
                <Link href="/products"><Button variant="outline">Clear Filters</Button></Link>
              )}
            </>
          }
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead className="text-right">On Hand</TableHead>
            <TableHead className="text-right">Free to Use</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageRows.map((row, i) => (
            <TableRow key={row.product_id}>
              <TableCell className="text-muted-foreground">{from + i + 1}</TableCell>
              <TableCell>
                <Link href={`/products/${row.product_id}`} className="font-medium hover:underline">
                  {row.name}
                </Link>
                <div className="text-xs text-muted-foreground">{row.sku}</div>
              </TableCell>
              <TableCell>{categoryNames.get(row.category_id) ?? "—"}</TableCell>
              <TableCell>{row.unit_of_measure}</TableCell>
              <TableCell className="text-right">{formatQty(row.on_hand)}</TableCell>
              <TableCell className="text-right">{formatQty(row.free_to_use)}</TableCell>
              <TableCell>
                <StockStatusBadge status={deriveStockStatus(row)} />
              </TableCell>
              <TableCell className="text-right">
                <ProductRowActions id={row.product_id} active={row.active} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <PaginationBar
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        pathname="/products"
        searchParams={searchParams as Record<string, string | string[] | undefined>}
      />
    </div>
  );
}
