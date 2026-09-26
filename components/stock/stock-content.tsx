import { createClient } from "@/lib/supabase/server";
import { fetchStockOverview } from "@/components/stock/stock-queries.server";
import { sanitizeSearch } from "@/lib/format";
import { StockView } from "@/components/stock/stock-view";

export async function StockContent({ searchParams }: { searchParams: { q?: string; category?: string } }) {
  const supabase = createClient();
  const q = sanitizeSearch(searchParams.q);
  const categoryId = searchParams.category || undefined;

  const [rows, categoriesRes] = await Promise.all([
    fetchStockOverview(supabase, { search: q || undefined, categoryId }),
    supabase.from("product_categories").select("id,name"),
  ]);

  if (categoriesRes.error) console.error("[stock] categories query failed", categoriesRes.error.message);
  const categoryNames = new Map((categoriesRes.data ?? []).map((c) => [c.id, c.name] as const));

  return <StockView rows={rows} categoryNames={categoryNames} hasFilters={Boolean(q || categoryId)} />;
}
