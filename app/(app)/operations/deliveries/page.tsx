import Link from "next/link";
import type { Metadata } from "next";
import { Truck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSearch, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { UrlSearchInput } from "@/components/shared/url-search-input";
import { UrlSelect } from "@/components/shared/url-select";
import { PaginationBar, parsePage } from "@/components/shared/pagination-bar";
import { StatusBadge, type OperationStatus } from "@/components/shared/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeliveriesView } from "@/components/deliveries/deliveries-view";

export const metadata: Metadata = { title: "Deliveries" };

const PAGE_SIZE = 20;
const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "waiting", label: "Waiting" },
  { value: "ready", label: "Ready" },
  { value: "done", label: "Done" },
  { value: "canceled", label: "Canceled" },
];

type DeliveryRow = {
  id: string;
  reference: string;
  scheduled_date: string;
  status: OperationStatus;
  delivery_address: string;
  customer: { name: string; contact_person: string | null } | null;
  warehouse: { name: string } | null;
  location: { name: string } | null;
};

function shortAddress(address: string) {
  return address.length > 40 ? `${address.slice(0, 40)}…` : address;
}

export default async function DeliveriesPage({
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

  const supabase = await createClient();
  const { data: warehouses } = await supabase.from("warehouses").select("id, name").eq("active", true).order("name");

  let customerIds: string[] = [];
  if (q) {
    const { data: matches } = await supabase.from("customers").select("id").ilike("name", `%${q}%`).limit(50);
    customerIds = (matches ?? []).map((c) => c.id);
  }

  const selectCols = `
    id, reference, scheduled_date, status, delivery_address,
    customer:customers(name, contact_person),
    warehouse:warehouses(name),
    location:locations(name)
  `;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function applyFilters(query: any) {
    let q2 = query;
    if (status) q2 = q2.eq("status", status);
    if (warehouse) q2 = q2.eq("warehouse_id", warehouse);
    if (from) q2 = q2.gte("scheduled_date", from);
    if (to) q2 = q2.lte("scheduled_date", to);
    if (q) {
      const orParts = [`reference.ilike.%${q}%`, `delivery_address.ilike.%${q}%`];
      if (customerIds.length) orParts.push(`customer_id.in.(${customerIds.join(",")})`);
      q2 = q2.or(orParts.join(","));
    }
    return q2;
  }

  const listQuery = applyFilters(supabase.from("deliveries").select(selectCols, { count: "exact" }))
    .order("scheduled_date", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const kanbanQuery = applyFilters(supabase.from("deliveries").select(selectCols))
    .order("scheduled_date", { ascending: false })
    .limit(200);

  const [{ data: rows, count, error }, { data: kanbanRows }] = await Promise.all([listQuery, kanbanQuery]);
  if (error) console.error("[deliveries:list]", error);

  const deliveries = (rows ?? []) as unknown as DeliveryRow[];
  const allDeliveries = (kanbanRows ?? []) as unknown as DeliveryRow[];
  const total = count ?? 0;
  const hasFilters = !!(q || status || warehouse || from || to);

  const emptyState = (
    <EmptyState
      icon={Truck}
      title="No deliveries found"
      description={hasFilters ? "Try adjusting your filters or search." : "Create your first delivery to dispatch stock to a customer."}
      actions={
        <>
          <Link href="/operations/deliveries/new" className={buttonVariants({ variant: "default" })}>
            New Delivery
          </Link>
          {hasFilters && (
            <Link href="/operations/deliveries" className={buttonVariants({ variant: "outline" })}>
              Clear Filters
            </Link>
          )}
        </>
      }
    />
  );

  const listView =
    deliveries.length === 0 ? (
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
            {deliveries.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  <Link href={`/operations/deliveries/${d.id}`} className="font-medium text-primary hover:underline">
                    {d.reference}
                  </Link>
                </TableCell>
                <TableCell>{d.warehouse?.name ? `${d.warehouse.name} / ${d.location?.name ?? "—"}` : "—"}</TableCell>
                <TableCell>{d.customer?.name ?? shortAddress(d.delivery_address)}</TableCell>
                <TableCell>{d.customer?.contact_person || d.customer?.name || "—"}</TableCell>
                <TableCell>{formatDate(d.scheduled_date)}</TableCell>
                <TableCell>
                  <StatusBadge status={d.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <PaginationBar page={page} pageSize={PAGE_SIZE} total={total} pathname="/operations/deliveries" searchParams={sp} />
      </div>
    );

  const columns: { status: OperationStatus; label: string }[] = [
    { status: "draft", label: "Draft" },
    { status: "waiting", label: "Waiting" },
    { status: "ready", label: "Ready" },
    { status: "done", label: "Done" },
    { status: "canceled", label: "Canceled" },
  ];

  const kanbanView =
    allDeliveries.length === 0 ? (
      <div className="rounded-xl border bg-card">{emptyState}</div>
    ) : (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {columns.map((col) => {
          const colItems = allDeliveries.filter((d) => d.status === col.status);
          return (
            <div key={col.status} className="rounded-xl border bg-card">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <span className="text-sm font-semibold">{col.label}</span>
                <span className="text-xs text-muted-foreground">{colItems.length}</span>
              </div>
              <div className="flex flex-col gap-2 p-2">
                {colItems.length === 0 && <p className="px-2 py-4 text-center text-xs text-muted-foreground">No deliveries</p>}
                {colItems.map((d) => (
                  <Link
                    key={d.id}
                    href={`/operations/deliveries/${d.id}`}
                    className="rounded-lg border bg-background p-2.5 text-sm transition-colors hover:border-primary/40 hover:bg-accent/40"
                  >
                    <div className="font-medium text-primary">{d.reference}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{d.customer?.name ?? shortAddress(d.delivery_address)}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{formatDate(d.scheduled_date)}</div>
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
        title="Deliveries (Outgoing Stock)"
        description="Dispatch outgoing stock to customers"
        actions={
          <Link href="/operations/deliveries/new" className={buttonVariants()}>
            New Delivery
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <UrlSearchInput placeholder="Search reference or customer..." />
        <UrlSelect param="status" label="Status" allLabel="All statuses" options={STATUS_OPTIONS} className="w-40" />
        <UrlSelect
          param="warehouse"
          label="Warehouse"
          allLabel="All warehouses"
          options={(warehouses ?? []).map((w) => ({ value: w.id, label: w.name }))}
          className="w-48"
        />
      </div>

      <DeliveriesView list={listView} kanban={kanbanView} />
    </div>
  );
}
