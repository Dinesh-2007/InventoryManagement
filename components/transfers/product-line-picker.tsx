"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type ProductOption = { id: string; name: string; sku: string; unit_of_measure: string };
export type ProductLine = { productId: string; quantity: number };

/**
 * Small, self-contained "add product + quantity" line editor for the
 * Transfers module. Built independently of the receipts module's picker
 * (different ownership) even though the UX is similar.
 */
export function ProductLinePicker({
  products,
  lines,
  onAdd,
  onRemove,
  onQuantityChange,
}: {
  products: ProductOption[];
  lines: ProductLine[];
  onAdd: (productId: string) => void;
  onRemove: (index: number) => void;
  onQuantityChange: (index: number, quantity: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p] as const)), [products]);
  const usedIds = useMemo(() => new Set(lines.map((l) => l.productId)), [lines]);
  const available = useMemo(() => products.filter((p) => !usedIds.has(p.id)), [products, usedIds]);

  return (
    <div className="space-y-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button type="button" variant="outline" size="sm">
              <Plus /> Add product
            </Button>
          }
        />
        <PopoverContent align="start" className="w-80 p-0">
          <Command>
            <CommandInput placeholder="Search products…" />
            <CommandList>
              <CommandEmpty>No products found.</CommandEmpty>
              <CommandGroup>
                {available.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={`${p.name} ${p.sku}`}
                    onSelect={() => {
                      onAdd(p.id);
                      setOpen(false);
                    }}
                  >
                    <div className="flex flex-col">
                      <span>{p.name}</span>
                      <span className="text-xs text-muted-foreground">{p.sku}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {lines.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">No products added yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="w-36">Quantity</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line, i) => {
              const p = byId.get(line.productId);
              return (
                <TableRow key={line.productId}>
                  <TableCell>{p?.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p?.sku ?? "—"}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={line.quantity}
                      onChange={(e) => onQuantityChange(i, Number(e.target.value))}
                      className="h-8 w-28"
                    />
                    {p?.unit_of_measure && <span className="ml-1.5 text-xs text-muted-foreground">{p.unit_of_measure}</span>}
                  </TableCell>
                  <TableCell>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove line" onClick={() => onRemove(i)}>
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
