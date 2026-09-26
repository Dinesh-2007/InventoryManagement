import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, History } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSearch, formatDateTime, formatQty } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { UrlSearchInput } from "@/components/shared/url-search-input";
import { UrlSelect } from "@/components/shared/url-select";
import { PaginationBar, parsePage } from "@/components/shared/pagination-bar";
import { StatusBadge } from "@/components/shared/status-badge";
import { DateRangeFilter } from "@/components/move-history/date-range-filter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

const TYPE_LABEL: Record<string, string> = {
  receipt: "Receipt",
  delivery: "Delivery",
  transfer: "Transfer",
  stock_adjustment: "Adjustment",
};

function referenceHref(type: string, id: string) {
  switch (type) {
    case "receipt": return `/operations/receipts/${id}`;
    case "delivery": return `/operations/deliveries/${id}`;
    case "transfer": return `/operations/transfers/${id}`;
    case "stock_adjustment": return `/operations/adjustments/${id}`;
    default: return "#";
  }
}

export default async function MoveHistoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const q = sanitizeSearch(typeof sp.q === "string" ? sp.q : undefined);
  const type = typeof sp.type === "string" ? sp.type : undefined;
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const warehouse = typeof sp.warehouse === "string" ? sp.warehouse : undefined;
  const from = typeof sp.from === "string" ? sp.from : undefined;
  const to = typeof sp.to === "string" ? sp.to : undefined;
  const sort = typeof sp.sort === "string" ? sp.sort : "newest";

  const supabase = createClient();
  const { data: warehouses } = await supabase.from("warehouses").select("id,name").order("name");

  return (
    <div>
      <PageHeader title="Move History" description="Every stock movement across receipts, deliveries, transfers and adjustments" />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <UrlSearchInput placeholder="Search reference, product, contact…" />
        <UrlSelect
          param="type"
          label="Type"
          allLabel="All Types"
          options={[
            { value: "receipt", label: "Receipt" },
            { value: "delivery", label: "Delivery" },
            { value: "transfer", label: "Transfer" },
            { value: "stock_adjustment", label: "Adjustment" },
          ]}
        />
        <UrlSelect
          param="status"
          label="Status"
          allLabel="All Statuses"
          options={[
            { value: "draft", label: "Draft" },
            { value: "waiting", label: "Waiting" },
            { value: "ready", label: "Ready" },
            { value: "done", label: "Done" },
            { value: "canceled", label: "Canceled" },
          ]}
        />
        <UrlSelect param="warehouse" label="Warehouse" allLabel="All Warehouses" options={(warehouses ?? []).map((w) => ({ value: w.id, label: w.name }))} />
        <DateRangeFilter />
        <UrlSelect
          param="sort"
          label="Sort"
          allLabel="Newest first"
          options={[
            { value: "oldest", label: "Oldest first" },
            { value: "quantity", label: "Quantity" },
          ]}
        />
      </div>
      <Suspense fallback={<TableSkeleton cols={7} />} key={`${page}-${q}-${type}-${status}-${warehouse}-${from}-${to}-${sort}`}>
        <MoveHistoryTable page={page} q={q} type={type} status={status} warehouse={warehouse} from={from} to={to} sort={sort} searchParams={sp} />
      </Suspense>
    </div>
  );
}

async function MoveHistoryTable({ page, q, type, status, warehouse, from, to, sort, searchParams }: {
  page: number; q: string; type?: string; status?: string; warehouse?: string; from?: string; to?: string; sort: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const supabase = createClient();
  let query = supabase
    .from("move_history_view")
    .select("*", { count: "exact" })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (q) query = query.or(`reference.ilike.%${q}%,product_name.ilike.%${q}%,contact_name.ilike.%${q}%`);
  if (type) query = query.eq("reference_type", type);
  if (status) query = query.eq("status", status);
  if (warehouse) query = query.eq("warehouse_id", warehouse);
  if (from) query = query.gte("created_at", `${from}T00:00:00`);
  if (to) query = query.lte("created_at", `${to}T23:59:59`);

  if (sort === "oldest") query = query.order("created_at", { ascending: true });
  else if (sort === "quantity") query = query.order("quantity", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  const { data, count, error } = await query;

  if (error) {
    console.error("[move-history]", error);
    return (
      <EmptyState
        icon={History}
        title="Move history is not available yet"
        description="The move_history_view hasn't landed in the database yet (it depends on the stock_ledger table from a parallel migration). Try again shortly."
      />
    );
  }

  const rows = data ?? [];
  if (rows.length === 0) {
    return <EmptyState icon={History} title="No movements found" description="Stock movements from receipts, deliveries, transfers and adjustments will show up here." />;
  }

  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reference</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>From / To</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const isTransfer = r.reference_type === "transfer";
            const rawQty = Number(r.quantity);
            const sign = isTransfer ? 0 : r.reference_type === "delivery" ? -1 : r.reference_type === "receipt" ? 1 : rawQty >= 0 ? 1 : -1;
            const fromName = r.from_location_name ?? (r.reference_type === "receipt" ? "External" : "—");
            const toName = r.to_location_name ?? (r.reference_type === "delivery" ? "External" : "—");

            return (
              <TableRow key={r.id}>
                <TableCell>
                  <Link href={referenceHref(r.reference_type, r.reference_id)} className="font-medium text-primary hover:underline">
                    {r.reference ?? "—"}
                  </Link>
                  <div className="text-xs text-muted-foreground">{TYPE_LABEL[r.reference_type] ?? r.reference_type}</div>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(r.created_at)}</TableCell>
                <TableCell>
                  {r.product_name}
                  <div className="text-xs text-muted-foreground">{r.product_sku}</div>
                </TableCell>
                <TableCell className="text-muted-foreground">{r.contact_name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {isTransfer ? (
                    <span className="inline-flex items-center gap-1">
                      {fromName} <ArrowRight className="size-3.5" /> {toName}
                    </span>
                  ) : (
                    <span>{fromName} / {toName}</span>
                  )}
                </TableCell>
                <TableCell className={cn("text-right font-medium", sign > 0 ? "text-emerald-600" : sign < 0 ? "text-rose-600" : "")}>
                  {sign > 0 ? "+" : sign < 0 ? "-" : ""}
                  {formatQty(Math.abs(rawQty))}
                </TableCell>
                <TableCell>{r.status ? <StatusBadge status={r.status} /> : "—"}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <PaginationBar page={page} pageSize={PAGE_SIZE} total={count ?? 0} pathname="/move-history" searchParams={searchParams} />
    </div>
  );
}
