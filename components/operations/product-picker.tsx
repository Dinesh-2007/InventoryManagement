"use client";

import { useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

export type PickableProduct = {
  id: string;
  sku: string;
  name: string;
  unit_of_measure: string;
  per_unit_cost: number;
};

/**
 * Searchable product combobox for receipt/delivery line items. The active products
 * list is small (seed data ~12-40 rows), so it is passed in as a prop from the
 * server page and filtered client-side here rather than hitting an API route.
 */
export function ProductPicker({
  products,
  value,
  onChange,
  excludeIds = [],
  placeholder = "Select a product…",
  disabled,
}: {
  products: PickableProduct[];
  value: string;
  onChange: (productId: string) => void;
  /** Product ids already used by other line items — hidden here to prevent duplicates. */
  excludeIds?: string[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const excluded = new Set(excludeIds);
  const options = products.filter((p) => p.id === value || !excluded.has(p.id));
  const selected = products.find((p) => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button type="button" variant="outline" disabled={disabled} className="w-full min-w-48 justify-between font-normal">
            <span className={cn("truncate", !selected && "text-muted-foreground")}>
              {selected ? `${selected.sku} — ${selected.name}` : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search by name or SKU…" />
          <CommandList>
            <CommandEmpty>No matching products.</CommandEmpty>
            <CommandGroup>
              {options.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`${p.sku} ${p.name}`}
                  data-checked={p.id === value}
                  onSelect={() => {
                    onChange(p.id);
                    setOpen(false);
                  }}
                >
                  <span className="truncate">
                    {p.sku} — {p.name}
                  </span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">{p.unit_of_measure}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
