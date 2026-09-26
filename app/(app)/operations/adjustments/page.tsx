import { Suspense } from "react";
import Link from "next/link";
import { Plus, ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSearch, formatDate } from "@/lib/format";
import { ADJUSTMENT_REASON_LABELS, ADJUSTMENT_REASONS } from "@/lib/validations/adjustments";
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

export default async function AdjustmentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const q = sanitizeSearch(typeof sp.q === "string" ? sp.q : undefined);
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const reason = typeof sp.reason === "string" ? sp.reason : undefined;

  return (
    <div>
      <PageHeader
        title="Stock Adjustments"
        description="Correct differences between system and physical stock counts"
        actions={
          <Button render={<Link href="/operations/adjustments/new" />} nativeButton={false}>
            <Plus /> New Adjustment
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
            { value: "done", label: "Done" },
            { value: "canceled", label: "Canceled" },
          ]}
        />
        <UrlSelect param="reason" label="Reason" allLabel="All Reasons" options={ADJUSTMENT_REASONS.map((r) => ({ value: r.value, label: r.label }))} />
      </div>
      <Suspense fallback={<TableSkeleton cols={5} />} key={`${page}-${q}-${status}-${reason}`}>
        <AdjustmentsTable page={page} q={q} status={status} reason={reason} searchParams={sp} />
      </Suspense>
    </div>
  );
}

type AdjustmentRow = {
  id: string;
  reference: string;
  reason: string;
  status: "draft" | "done" | "canceled";
  created_at: string;
  warehouse: { name: string } | null;
  location: { name: string } | null;
};

async function AdjustmentsTable({ page, q, status, reason, searchParams }: {
  page: number; q: string; status?: string; reason?: string; searchParams: Record<string, string | string[] | undefined>;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("stock_adjustments")
    .select(
      "id,reference,reason,status,created_at," +
        "warehouse:warehouses!stock_adjustments_warehouse_id_fkey(name)," +
        "location:locations!stock_adjustments_location_id_warehouse_id_fkey(name)",
      { count: "exact" },
    );

  if (q) query = query.ilike("reference", `%${q}%`);
  if (status) query = query.eq("status", status);
  if (reason) query = query.eq("reason", reason);

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
    .returns<AdjustmentRow[]>();
  if (error) console.error("[adjustments list]", error);
  const rows = data ?? [];

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No adjustments found"
        description="Create a stock adjustment to correct system quantities against a physical count."
        actions={
          <Button render={<Link href="/operations/adjustments/new" />} nativeButton={false}>
            <Plus /> New Adjustment
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
            <TableHead>Warehouse / Location</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((a) => (
            <TableRow key={a.id}>
              <TableCell>
                <Link href={`/operations/adjustments/${a.id}`} className="font-medium text-primary hover:underline">
                  {a.reference}
                </Link>
              </TableCell>
              <TableCell>
                {a.warehouse?.name} <span className="text-muted-foreground">/ {a.location?.name}</span>
              </TableCell>
              <TableCell>{ADJUSTMENT_REASON_LABELS[a.reason] ?? a.reason}</TableCell>
              <TableCell>{formatDate(a.created_at)}</TableCell>
              <TableCell><StatusBadge status={a.status} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <PaginationBar page={page} pageSize={PAGE_SIZE} total={count ?? 0} pathname="/operations/adjustments" searchParams={searchParams} />
    </div>
  );
}
