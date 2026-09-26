import { Suspense } from "react";
import { Plus, Truck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { setSupplierActive } from "@/actions/suppliers";
import { sanitizeSearch } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { UrlSearchInput } from "@/components/shared/url-search-input";
import { PaginationBar, parsePage } from "@/components/shared/pagination-bar";
import { ActiveBadge } from "@/components/shared/status-badge";
import { ToggleActiveButton } from "@/components/settings/toggle-active-button";
import { SupplierFormDialog } from "@/components/settings/supplier-form";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PAGE_SIZE = 20;

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const q = sanitizeSearch(typeof sp.q === "string" ? sp.q : undefined);

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Manage the vendors you receive stock from"
        actions={<SupplierFormDialog trigger={<Button><Plus /> New Supplier</Button>} />}
      />
      <div className="mb-4">
        <UrlSearchInput placeholder="Search suppliers…" />
      </div>
      <Suspense fallback={<TableSkeleton cols={5} />} key={`${page}-${q}`}>
        <SuppliersTable page={page} q={q} searchParams={sp} />
      </Suspense>
    </div>
  );
}

async function SuppliersTable({ page, q, searchParams }: { page: number; q: string; searchParams: Record<string, string | string[] | undefined> }) {
  const supabase = createClient();
  let query = supabase
    .from("suppliers")
    .select("id,name,contact_person,phone,email,address,active", { count: "exact" })
    .order("name")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (q) query = query.or(`name.ilike.%${q}%,contact_person.ilike.%${q}%,email.ilike.%${q}%`);

  const { data, count, error } = await query;
  if (error) console.error("[suppliers list]", error);
  const rows = data ?? [];

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Truck}
        title="No suppliers found"
        description="Add a supplier to start receiving stock from them."
        actions={<SupplierFormDialog trigger={<Button><Plus /> New Supplier</Button>} />}
      />
    );
  }

  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contact Person</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">{s.name}</TableCell>
              <TableCell className="text-muted-foreground">{s.contact_person ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{s.phone ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{s.email ?? "—"}</TableCell>
              <TableCell><ActiveBadge active={s.active} /></TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <SupplierFormDialog supplier={s} trigger={<Button variant="ghost" size="sm">Edit</Button>} />
                  <ToggleActiveButton active={s.active} label={s.name} onToggle={setSupplierActive.bind(null, s.id)} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <PaginationBar page={page} pageSize={PAGE_SIZE} total={count ?? 0} pathname="/settings/suppliers" searchParams={searchParams} />
    </div>
  );
}
