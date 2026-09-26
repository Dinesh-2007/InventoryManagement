import { CheckCircle2, CircleDashed, Clock, FileEdit, XCircle, PackageCheck, AlertTriangle, PackageX, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

export type OperationStatus = "draft" | "waiting" | "ready" | "done" | "canceled";
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock" | "inactive";

const OP: Record<OperationStatus, { label: string; cls: string; Icon: typeof Clock }> = {
  draft: { label: "Draft", cls: "bg-slate-100 text-slate-700 ring-slate-200", Icon: FileEdit },
  waiting: { label: "Waiting", cls: "bg-amber-50 text-amber-800 ring-amber-200", Icon: Clock },
  ready: { label: "Ready", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", Icon: CircleDashed },
  done: { label: "Done", cls: "bg-sky-50 text-sky-700 ring-sky-200", Icon: CheckCircle2 },
  canceled: { label: "Canceled", cls: "bg-rose-50 text-rose-700 ring-rose-200", Icon: XCircle },
};

const STOCK: Record<StockStatus, { label: string; cls: string; Icon: typeof Clock }> = {
  in_stock: { label: "In Stock", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", Icon: PackageCheck },
  low_stock: { label: "Low Stock", cls: "bg-amber-50 text-amber-800 ring-amber-200", Icon: AlertTriangle },
  out_of_stock: { label: "Out of Stock", cls: "bg-rose-50 text-rose-700 ring-rose-200", Icon: PackageX },
  inactive: { label: "Inactive", cls: "bg-slate-100 text-slate-600 ring-slate-200", Icon: Ban },
};

const base = "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap";

export function StatusBadge({ status, className }: { status: OperationStatus; className?: string }) {
  const s = OP[status] ?? OP.draft;
  return (
    <span className={cn(base, s.cls, className)}>
      <s.Icon className="size-3" aria-hidden="true" />
      {s.label}
    </span>
  );
}

export function StockStatusBadge({ status, className }: { status: StockStatus; className?: string }) {
  const s = STOCK[status] ?? STOCK.in_stock;
  return (
    <span className={cn(base, s.cls, className)}>
      <s.Icon className="size-3" aria-hidden="true" />
      {s.label}
    </span>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span className={cn(base, active ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-600 ring-slate-200")}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export const OPERATION_STATUS_LABEL = Object.fromEntries(Object.entries(OP).map(([k, v]) => [k, v.label])) as Record<OperationStatus, string>;
