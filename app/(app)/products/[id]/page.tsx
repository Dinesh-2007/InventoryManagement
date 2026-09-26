import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ActiveBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency, formatDateTime, formatQty } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { fetchStockByLocation } from "@/components/stock/stock-queries.server";

export const metadata = { title: "Product | StockSense" };

const REFERENCE_ROUTES: Record<string, string> = {
  receipt: "/operations/receipts",
  delivery: "/operations/deliveries",
  transfer: "/operations/transfers",
  stock_adjustment: "/operations/adjustments",
};

const MOVEMENT_LABEL: Record<string, string> = {
  RECEIPT: "Receipt",
  DELIVERY: "Delivery",
  TRANSFER: "Transfer",
  ADJUSTMENT: "Adjustment",
};

const MOVEMENT_CLS: Record<string, string> = {
  RECEIPT: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  DELIVERY: "bg-sky-50 text-sky-700 ring-sky-200",
  TRANSFER: "bg-violet-50 text-violet-700 ring-violet-200",
  ADJUSTMENT: "bg-amber-50 text-amber-800 ring-amber-200",
};

type LedgerRow = {
  id: string;
  movement_type: string;
  quantity: number;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
  location_id: string | null;
  locations?: { name: string; warehouses?: { name: string } | { name: string }[] | null } | null;
};

async function fetchMovements(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  productId: string,
): Promise<LedgerRow[]> {
  const { data, error } = await supabase
    .from("stock_ledger")
    .select("id,movement_type,quantity,reference_type,reference_id,created_at,location_id,locations!stock_ledger_location_id_fkey(name,warehouses(name))")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) {
    console.error("[products/[id]] stock_ledger query failed (has the DB agent's migration landed yet?)", error.message);
    return [];
  }
  return (data ?? []) as LedgerRow[];
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient();

  const [productRes, locationRows, movements] = await Promise.all([
    supabase
      .from("products")
      .select("id,name,sku,unit_of_measure,per_unit_cost,reorder_point,reorder_quantity,description,active,product_categories(name)")
      .eq("id", id)
      .maybeSingle(),
    fetchStockByLocation(supabase, id),
    fetchMovements(supabase, id),
  ]);

  if (productRes.error) console.error("[products/[id]] product query failed", productRes.error.message);
  if (!productRes.data) notFound();

  const product = productRes.data;
  const category = Array.isArray(product.product_categories) ? product.product_categories[0] : product.product_categories;
  const totalOnHand = locationRows.reduce((sum, r) => sum + Number(r.quantity_on_hand), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        description={product.sku}
        actions={
          <Link href={`/products/${id}/edit`}>
            <Button>
              <Pencil /> Edit
            </Button>
          </Link>
        }
      />

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Overview</CardTitle>
          <ActiveBadge active={product.active} />
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-xs text-muted-foreground">Category</div>
            <div className="text-sm font-medium">{category?.name ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Unit of Measure</div>
            <div className="text-sm font-medium">{product.unit_of_measure}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Per Unit Cost</div>
            <div className="text-sm font-medium">{formatCurrency(product.per_unit_cost)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">On Hand (all locations)</div>
            <div className="text-sm font-medium">{formatQty(totalOnHand, product.unit_of_measure)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Reorder Point</div>
            <div className="text-sm font-medium">{formatQty(product.reorder_point, product.unit_of_measure)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Reorder Quantity</div>
            <div className="text-sm font-medium">{formatQty(product.reorder_quantity, product.unit_of_measure)}</div>
          </div>
          {product.description && (
            <div className="sm:col-span-2 lg:col-span-4">
              <div className="text-xs text-muted-foreground">Description</div>
              <div className="text-sm">{product.description}</div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stock by Location</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {locationRows.length === 0 ? (
            <EmptyState title="No stock recorded" description="This product has no balance at any location yet." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">On Hand</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locationRows.map((r) => (
                  <TableRow key={r.location_id}>
                    <TableCell>{r.warehouse_name}</TableCell>
                    <TableCell>{r.location_name}</TableCell>
                    <TableCell className="text-right">{formatQty(r.quantity_on_hand, product.unit_of_measure)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Movements</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {movements.length === 0 ? (
            <EmptyState title="No movements yet" description="Stock movements for this product will appear here." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => {
                  const wh = Array.isArray(m.locations?.warehouses) ? m.locations?.warehouses[0] : m.locations?.warehouses;
                  const locationLabel = m.locations ? `${wh?.name ?? ""} — ${m.locations.name}` : "—";
                  const routeBase = m.reference_type ? REFERENCE_ROUTES[m.reference_type] : undefined;
                  const qty = Number(m.quantity);
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="text-muted-foreground">{formatDateTime(m.created_at)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${MOVEMENT_CLS[m.movement_type] ?? "bg-slate-100 text-slate-700 ring-slate-200"}`}>
                          {MOVEMENT_LABEL[m.movement_type] ?? m.movement_type}
                        </span>
                      </TableCell>
                      <TableCell>
                        {routeBase && m.reference_id ? (
                          <Link href={`${routeBase}/${m.reference_id}`} className="text-primary hover:underline">
                            View
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">
                            {m.reference_type === "product" || m.reference_type === "seed" ? "Opening balance" : "—"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{locationLabel}</TableCell>
                      <TableCell className={`text-right font-medium ${qty >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {qty >= 0 ? "+" : ""}
                        {formatQty(qty, product.unit_of_measure)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
