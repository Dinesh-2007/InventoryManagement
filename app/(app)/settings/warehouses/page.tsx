import { Suspense } from "react";
import Link from "next/link";
import { Plus, Warehouse as WarehouseIcon, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { setWarehouseActive } from "@/actions/warehouses";
import { sanitizeSearch } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { UrlSearchInput } from "@/components/shared/url-search-input";
import { PaginationBar, parsePage } from "@/components/shared/pagination-bar";
import { ActiveBadge } from "@/components/shared/status-badge";
import { ToggleActiveButton } from "@/components/settings/toggle-active-button";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PAGE_SIZE = 20;

export default async function WarehousesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const q = sanitizeSearch(typeof sp.q === "string" ? sp.q : undefined);

  return (
    <div>
      <PageHeader
        title="Warehouses"
        description="Manage your warehouses"
        actions={
          <Button render={<Link href="/settings/warehouses/new" />}>
            <Plus /> New Warehouse
          </Button>
        }
      />
      <div className="mb-4">
        <UrlSearchInput placeholder="Search warehouses…" />
      </div>
      <Suspense fallback={<TableSkeleton cols={4} />} key={`${page}-${q}`}>
        <WarehousesTable page={page} q={q} searchParams={sp} />
      </Suspense>
    </div>
  );
}

async function WarehousesTable({ page, q, searchParams }: { page: number; q: string; searchParams: Record<string, string | string[] | undefined> }) {
  const supabase = await createClient();
  let query = supabase
    .from("warehouses")
    .select("id,name,short_code,address,active", { count: "exact" })
    .order("name")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (q) query = query.or(`name.ilike.%${q}%,short_code.ilike.%${q}%`);

  const { data, count, error } = await query;
  if (error) console.error("[warehouses list]", error);
  const rows = data ?? [];

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={WarehouseIcon}
        title="No warehouses found"
        description="Create a warehouse to start organizing your stock locations."
        actions={
          <Button render={<Link href="/settings/warehouses/new" />}>
            <Plus /> New Warehouse
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
            <TableHead>Name</TableHead>
            <TableHead>Short Code</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((w) => (
            <TableRow key={w.id}>
              <TableCell className="font-medium">{w.name}</TableCell>
              <TableCell>{w.short_code}</TableCell>
              <TableCell className="text-muted-foreground">{w.address ?? "—"}</TableCell>
              <TableCell><ActiveBadge active={w.active} /></TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon-sm" aria-label="Edit" render={<Link href={`/settings/warehouses/${w.id}`} />}>
                    <Pencil />
                  </Button>
                  <ToggleActiveButton active={w.active} label={w.name} onToggle={(next) => setWarehouseActive(w.id, next)} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <PaginationBar page={page} pageSize={PAGE_SIZE} total={count ?? 0} pathname="/settings/warehouses" searchParams={searchParams} />
    </div>
  );
}
