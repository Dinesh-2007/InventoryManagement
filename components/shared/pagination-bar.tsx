import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Server-rendered pager. `searchParams` = current params; builds ?page=N links. */
export function PaginationBar({ page, pageSize, total, pathname, searchParams }: {
  page: number; pageSize: number; total: number; pathname: string; searchParams: Record<string, string | string[] | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (typeof v === "string" && k !== "page") sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return s ? `${pathname}?${s}` : pathname;
  };
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex items-center justify-between gap-2 border-t px-4 py-3 text-sm text-muted-foreground no-print">
      <span>{from}–{to} of {total}</span>
      <div className="flex items-center gap-1">
        <Link aria-label="Previous page" aria-disabled={page <= 1} href={href(Math.max(1, page - 1))}
          className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }), page <= 1 && "pointer-events-none opacity-50")}>
          <ChevronLeft />
        </Link>
        <span className="px-2">Page {page} / {pages}</span>
        <Link aria-label="Next page" aria-disabled={page >= pages} href={href(Math.min(pages, page + 1))}
          className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }), page >= pages && "pointer-events-none opacity-50")}>
          <ChevronRight />
        </Link>
      </div>
    </div>
  );
}

export function parsePage(v: string | string[] | undefined) {
  const n = Number(typeof v === "string" ? v : 1);
  return Number.isInteger(n) && n > 0 ? n : 1;
}
