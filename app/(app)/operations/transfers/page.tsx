import { Suspense } from "react";
import Link from "next/link";
import { Plus, ArrowLeftRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSearch, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { UrlSearchInput } from "@/components/shared/url-search-input";
import { UrlSelect } from "@/components/shared/url-select";
import { PaginationBar, parsePage } from "@/components/shared/pagination-bar";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PAGE_SIZE = 20;

export default async function TransfersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const q = sanitizeSearch(typeof sp.q === "string" ? sp.q : undefined);
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const warehouse = typeof sp.warehouse === "string" ? sp.warehouse : undefined;

  const supabase = await createClient();
  const { data: warehouses } = await supabase.from("warehouses").select("id,name").order("name");

  return (
    <div>
      <PageHeader
        title="Internal Transfers"
        description="Move stock between warehouses and locations"
        actions={
          <Button render={<Link href="/operations/transfers/new" />}>
            <Plus /> New Transfer
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <UrlSearchInput placeholder="Search reference…" />
        <UrlSelect
          param="status"
          label="Status"
          allLabel="All Statuses"
          options={[
            { value: "draft", label: "Draft" },
            { value: "ready", label: "Ready" },
            { value: "done", label: "Done" },
            { value: "canceled", label: "Canceled" },
          ]}
        />
        <UrlSelect param="warehouse" label="Warehouse" allLabel="All Warehouses" options={(warehouses ?? []).map((w) => ({ value: w.id, label: w.name }))} />
      </div>
      <Suspense fallback={<TableSkeleton cols={5} />} key={`${page}-${q}-${status}-${warehouse}`}>
        <TransfersTable page={page} q={q} status={status} warehouse={warehouse} searchParams={sp} />
      </Suspense>
    </div>
  );
}

async function TransfersTable({ page, q, status, warehouse, searchParams }: {
  page: number; q: string; status?: string; warehouse?: string; searchParams: Record<string, string | string[] | undefined>;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("internal_transfers")
    .select(
      "id,reference,scheduled_date,status," +
        "source_warehouse:warehouses!internal_transfers_source_warehouse_id_fkey(name)," +
        "source_location:locations!internal_transfers_source_location_id_source_warehouse_id_fkey(name)," +
        "dest_warehouse:warehouses!internal_transfers_dest_warehouse_id_fkey(name)," +
        "dest_location:locations!internal_transfers_dest_location_id_dest_warehouse_id_fkey(name)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (q) query = query.ilike("reference", `%${q}%`);
  if (status) query = query.eq("status", status);
  if (warehouse) query = query.or(`source_warehouse_id.eq.${warehouse},dest_warehouse_id.eq.${warehouse}`);

  const { data, count, error } = await query;
  if (error) console.error("[transfers list]", error);
  const rows = data ?? [];

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={ArrowLeftRight}
        title="No transfers found"
        description="Create an internal transfer to move stock between locations."
        actions={
          <Button render={<Link href="/operations/transfers/new" />}>
            <Plus /> New Transfer
          </Button>
        }
      />
    );
  }

  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reference</TableHead>
            <TableHead>From</TableHead>
            <TableHead>To</TableHead>
            <TableHead>Schedule Date</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((t) => (
            <TableRow key={t.id}>
              <TableCell>
                <Link href={`/operations/transfers/${t.id}`} className="font-medium text-primary hover:underline">
                  {t.reference}
                </Link>
              </TableCell>
              <TableCell>
                {t.source_warehouse?.name} <span className="text-muted-foreground">/ {t.source_location?.name}</span>
              </TableCell>
              <TableCell>
                {t.dest_warehouse?.name} <span className="text-muted-foreground">/ {t.dest_location?.name}</span>
              </TableCell>
              <TableCell>{formatDate(t.scheduled_date)}</TableCell>
              <TableCell><StatusBadge status={t.status} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <PaginationBar page={page} pageSize={PAGE_SIZE} total={count ?? 0} pathname="/operations/transfers" searchParams={searchParams} />
    </div>
  );
}
