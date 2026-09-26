"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

/** Dropdown filter bound to a URL query param; empty value removes it. Resets `page`. */
export function UrlSelect({ param, label, options, allLabel, className }: {
  param: string; label: string; allLabel: string; className?: string;
  options: { value: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <NativeSelect
      aria-label={label}
      className={className}
      value={params.get(param) ?? ""}
      onChange={(e) => {
        const next = new URLSearchParams(params.toString());
        if (e.target.value) next.set(param, e.target.value); else next.delete(param);
        next.delete("page");
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      }}
    >
      <NativeSelectOption value="">{allLabel}</NativeSelectOption>
      {options.map((o) => <NativeSelectOption key={o.value} value={o.value}>{o.label}</NativeSelectOption>)}
    </NativeSelect>
  );
}
