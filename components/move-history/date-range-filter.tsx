"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Two native date inputs bound to `from`/`to` URL params, mirroring UrlSelect's contract. */
export function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  const inputClass =
    "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="date"
        aria-label="From date"
        defaultValue={params.get("from") ?? ""}
        onChange={(e) => setParam("from", e.target.value)}
        className={inputClass}
      />
      <span className="text-sm text-muted-foreground">to</span>
      <input
        type="date"
        aria-label="To date"
        defaultValue={params.get("to") ?? ""}
        onChange={(e) => setParam("to", e.target.value)}
        className={inputClass}
      />
    </div>
  );
}
