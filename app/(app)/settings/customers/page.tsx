import { Suspense } from "react";
import { Plus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { setCustomerActive } from "@/actions/customers";
import { sanitizeSearch } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { UrlSearchInput } from "@/components/shared/url-search-input";
import { PaginationBar, parsePage } from "@/components/shared/pagination-bar";
import { ActiveBadge } from "@/components/shared/status-badge";
import { ToggleActiveButton } from "@/components/settings/toggle-active-button";
import { CustomerFormDialog } from "@/components/settings/customer-form";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PAGE_SIZE = 20;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const q = sanitizeSearch(typeof sp.q === "string" ? sp.q : undefined);

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Manage the customers you deliver stock to"
        actions={<CustomerFormDialog trigger={<Button><Plus /> New Customer</Button>} />}
      />
      <div className="mb-4">
        <UrlSearchInput placeholder="Search customers…" />
      </div>
      <Suspense fallback={<TableSkeleton cols={5} />} key={`${page}-${q}`}>
        <CustomersTable page={page} q={q} searchParams={sp} />
      </Suspense>
    </div>
  );
}

async function CustomersTable({ page, q, searchParams }: { page: number; q: string; searchParams: Record<string, string | string[] | undefined> }) {
  const supabase = await createClient();
  let query = supabase
    .from("customers")
    .select("id,name,contact_person,phone,email,address,active", { count: "exact" })
    .order("name")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (q) query = query.or(`name.ilike.%${q}%,contact_person.ilike.%${q}%,email.ilike.%${q}%`);

  const { data, count, error } = await query;
  if (error) console.error("[customers list]", error);
  const rows = data ?? [];

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No customers found"
        description="Add a customer to start delivering stock to them."
        actions={<CustomerFormDialog trigger={<Button><Plus /> New Customer</Button>} />}
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
          {rows.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.name}</TableCell>
              <TableCell className="text-muted-foreground">{c.contact_person ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{c.phone ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{c.email ?? "—"}</TableCell>
              <TableCell><ActiveBadge active={c.active} /></TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <CustomerFormDialog customer={c} trigger={<Button variant="ghost" size="sm">Edit</Button>} />
                  <ToggleActiveButton active={c.active} label={c.name} onToggle={(next) => setCustomerActive(c.id, next)} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <PaginationBar page={page} pageSize={PAGE_SIZE} total={count ?? 0} pathname="/settings/customers" searchParams={searchParams} />
    </div>
  );
}
