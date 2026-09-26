import Link from "next/link";
import type { Metadata } from "next";
import { PackageOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSearch } from "@/lib/format";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { UrlSearchInput } from "@/components/shared/url-search-input";
import { UrlSelect } from "@/components/shared/url-select";
import { PaginationBar, parsePage } from "@/components/shared/pagination-bar";
import { StatusBadge, type OperationStatus } from "@/components/shared/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReceiptsView } from "@/components/receipts/receipts-view";

export const metadata: Metadata = { title: "Receipts" };

const PAGE_SIZE = 20;
const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "ready", label: "Ready" },
  { value: "done", label: "Done" },
  { value: "canceled", label: "Canceled" },
];

type ReceiptRow = {
  id: string;
  reference: string;
  scheduled_date: string;
  status: OperationStatus;
  supplier: { name: string; contact_person: string | null } | null;
  warehouse: { name: string } | null;
  location: { name: string } | null;
  responsible: { full_name: string } | null;
};

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = sanitizeSearch(typeof sp.q === "string" ? sp.q : undefined);
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const warehouse = typeof sp.warehouse === "string" ? sp.warehouse : undefined;
  const from = typeof sp.from === "string" ? sp.from : undefined;
  const to = typeof sp.to === "string" ? sp.to : undefined;
  const page = parsePage(sp.page);

  const supabase = createClient();

  const { data: warehouses } = await supabase.from("warehouses").select("id, name").eq("active", true).order("name");

  let supplierIds: string[] = [];
  if (q) {
    const { data: matches } = await supabase.from("suppliers").select("id").ilike("name", `%${q}%`).limit(50);
    supplierIds = (matches ?? []).map((s) => s.id);
  }

  const selectCols = `
    id, reference, scheduled_date, status,
    supplier:suppliers(name, contact_person),
    warehouse:warehouses(name),
    location:locations(name),
    responsible:profiles!receipts_responsible_id_fkey(full_name)
  `;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function applyFilters(query: any) {
    let q2 = query;
    if (status) q2 = q2.eq("status", status);
    if (warehouse) q2 = q2.eq("warehouse_id", warehouse);
    if (from) q2 = q2.gte("scheduled_date", from);
    if (to) q2 = q2.lte("scheduled_date", to);
    if (q) {
      const orParts = [`reference.ilike.%${q}%`];
      if (supplierIds.length) orParts.push(`supplier_id.in.(${supplierIds.join(",")})`);
      q2 = q2.or(orParts.join(","));
    }
    return q2;
  }

  const listQuery = applyFilters(supabase.from("receipts").select(selectCols, { count: "exact" }))
    .order("scheduled_date", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const kanbanQuery = applyFilters(supabase.from("receipts").select(selectCols))
    .order("scheduled_date", { ascending: false })
    .limit(200);

  const [{ data: rows, count, error }, { data: kanbanRows }] = await Promise.all([listQuery, kanbanQuery]);

  if (error) console.error("[receipts:list]", error);

  const receipts = (rows ?? []) as unknown as ReceiptRow[];
  const allReceipts = (kanbanRows ?? []) as unknown as ReceiptRow[];
  const total = count ?? 0;
  const hasFilters = !!(q || status || warehouse || from || to);

  const emptyState = (
    <EmptyState
      icon={PackageOpen}
      title="No receipts found"
      description={hasFilters ? "Try adjusting your filters or search." : "Create your first receipt to bring stock into a warehouse."}
      actions={
        <>
          <Link href="/operations/receipts/new" className={buttonVariants({ variant: "default" })}>
            New Receipt
          </Link>
          {hasFilters && (
            <Link href="/operations/receipts" className={buttonVariants({ variant: "outline" })}>
              Clear Filters
            </Link>
          )}
        </>
      }
    />
  );

  const listView =
    receipts.length === 0 ? (
      <div className="rounded-xl border bg-card">{emptyState}</div>
    ) : (
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Schedule Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {receipts.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Link href={`/operations/receipts/${r.id}`} className="font-medium text-primary hover:underline">
                    {r.reference}
                  </Link>
                </TableCell>
                <TableCell>{r.supplier?.name ?? "—"}</TableCell>
                <TableCell>{r.warehouse?.name ? `${r.warehouse.name} / ${r.location?.name ?? "—"}` : "—"}</TableCell>
                <TableCell>{r.supplier?.contact_person || r.supplier?.name || "—"}</TableCell>
                <TableCell>{formatDate(r.scheduled_date)}</TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <PaginationBar page={page} pageSize={PAGE_SIZE} total={total} pathname="/operations/receipts" searchParams={sp} />
      </div>
    );

  const columns: { status: OperationStatus; label: string }[] = [
    { status: "draft", label: "Draft" },
    { status: "ready", label: "Ready" },
    { status: "done", label: "Done" },
    { status: "canceled", label: "Canceled" },
  ];

  const kanbanView =
    allReceipts.length === 0 ? (
      <div className="rounded-xl border bg-card">{emptyState}</div>
    ) : (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {columns.map((col) => {
          const items = allReceipts.filter((r) => r.status === col.status);
          return (
            <div key={col.status} className="rounded-xl border bg-card">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <span className="text-sm font-semibold">{col.label}</span>
                <span className="text-xs text-muted-foreground">{items.length}</span>
              </div>
              <div className="flex flex-col gap-2 p-2">
                {items.length === 0 && <p className="px-2 py-4 text-center text-xs text-muted-foreground">No receipts</p>}
                {items.map((r) => (
                  <Link
                    key={r.id}
                    href={`/operations/receipts/${r.id}`}
                    className="rounded-lg border bg-background p-2.5 text-sm transition-colors hover:border-primary/40 hover:bg-accent/40"
                  >
                    <div className="font-medium text-primary">{r.reference}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{r.supplier?.name ?? "—"}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{formatDate(r.scheduled_date)}</div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );

  return (
    <div>
      <PageHeader
        title="Receipts (Incoming Stock)"
        description="Manage incoming stock from suppliers"
        actions={
          <Link href="/operations/receipts/new" className={buttonVariants()}>
            New Receipt
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <UrlSearchInput placeholder="Search reference or supplier..." />
        <UrlSelect param="status" label="Status" allLabel="All statuses" options={STATUS_OPTIONS} className="w-40" />
        <UrlSelect
          param="warehouse"
          label="Warehouse"
          allLabel="All warehouses"
          options={(warehouses ?? []).map((w) => ({ value: w.id, label: w.name }))}
          className="w-48"
        />
      </div>

      <ReceiptsView list={listView} kanban={kanbanView} />
    </div>
  );
}
