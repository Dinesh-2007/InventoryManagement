import { Suspense } from "react";
import Link from "next/link";
import { Plus, MapPin, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { setLocationActive } from "@/actions/locations";
import { sanitizeSearch } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { UrlSearchInput } from "@/components/shared/url-search-input";
import { UrlSelect } from "@/components/shared/url-select";
import { PaginationBar, parsePage } from "@/components/shared/pagination-bar";
import { ActiveBadge } from "@/components/shared/status-badge";
import { ToggleActiveButton } from "@/components/settings/toggle-active-button";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { requireManager } from "@/lib/auth/server";

const PAGE_SIZE = 20;

export default async function LocationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireManager();
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const q = sanitizeSearch(typeof sp.q === "string" ? sp.q : undefined);
  const warehouse = typeof sp.warehouse === "string" ? sp.warehouse : undefined;

  const supabase = createClient();
  const { data: warehouses } = await supabase.from("warehouses").select("id,name").order("name");

  return (
    <div>
      <PageHeader
        title="Locations"
        description="Manage locations across all warehouses"
        actions={
          <Button render={<Link href="/settings/locations/new" />} nativeButton={false}>
            <Plus /> New Location
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <UrlSearchInput placeholder="Search locations…" />
        <UrlSelect param="warehouse" label="Warehouse" allLabel="All Warehouses" options={(warehouses ?? []).map((w) => ({ value: w.id, label: w.name }))} />
      </div>
      <Suspense fallback={<TableSkeleton cols={5} />} key={`${page}-${q}-${warehouse}`}>
        <LocationsTable page={page} q={q} warehouse={warehouse} searchParams={sp} />
      </Suspense>
    </div>
  );
}

async function LocationsTable({ page, q, warehouse, searchParams }: {
  page: number; q: string; warehouse?: string; searchParams: Record<string, string | string[] | undefined>;
}) {
  const supabase = createClient();
  let query = supabase
    .from("locations")
    .select("id,name,short_code,active,warehouse:warehouses!locations_warehouse_id_fkey(id,name)", { count: "exact" });
  if (q) query = query.or(`name.ilike.%${q}%,short_code.ilike.%${q}%`);
  if (warehouse) query = query.eq("warehouse_id", warehouse);

  const { data, count, error } = await query
    .order("name")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
    .returns<{ id: string; name: string; short_code: string; active: boolean; warehouse: { id: string; name: string } | null }[]>();
  if (error) console.error("[locations list]", error);
  const rows = data ?? [];

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={MapPin}
        title="No locations found"
        description="Create a location inside a warehouse to start tracking stock there."
        actions={
          <Button render={<Link href="/settings/locations/new" />} nativeButton={false}>
            <Plus /> New Location
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
            <TableHead className="w-12">#</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Short Code</TableHead>
            <TableHead>Warehouse</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((l, i) => (
            <TableRow key={l.id}>
              <TableCell className="text-muted-foreground">{(page - 1) * PAGE_SIZE + i + 1}</TableCell>
              <TableCell className="font-medium">{l.name}</TableCell>
              <TableCell>{l.short_code}</TableCell>
              <TableCell>{l.warehouse?.name ?? "—"}</TableCell>
              <TableCell><ActiveBadge active={l.active} /></TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon-sm" aria-label="Edit" render={<Link href={`/settings/locations/${l.id}`} />} nativeButton={false}>
                    <Pencil />
                  </Button>
                  <ToggleActiveButton active={l.active} label={l.name} onToggle={setLocationActive.bind(null, l.id)} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <PaginationBar page={page} pageSize={PAGE_SIZE} total={count ?? 0} pathname="/settings/locations" searchParams={searchParams} />
    </div>
  );
}
