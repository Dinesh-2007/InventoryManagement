"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { createAdjustment } from "@/actions/adjustments";
import { ADJUSTMENT_REASONS, adjustmentSchema, type AdjustmentInput } from "@/lib/validations/adjustments";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdjustmentLineRow, type AdjustmentProductOption } from "./adjustment-line-row";

type WarehouseOption = { id: string; name: string; short_code: string };
type LocationOption = { id: string; name: string; short_code: string; warehouse_id: string };

export function AdjustmentForm({
  warehouses,
  locations,
  products,
}: {
  warehouses: WarehouseOption[];
  locations: LocationOption[];
  products: AdjustmentProductOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingMode, setPendingMode] = useState<"draft" | "validate" | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const form = useForm<AdjustmentInput>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: { warehouseId: "", locationId: "", reason: undefined, notes: "", items: [] },
  });

  const { fields, append, remove, update } = useFieldArray({ control: form.control, name: "items" });
  const errors = form.formState.errors;

  const warehouseId = form.watch("warehouseId");
  const locationId = form.watch("locationId");
  const availableLocations = locations.filter((l) => l.warehouse_id === warehouseId);
  const byId = new Map(products.map((p) => [p.id, p] as const));
  const usedIds = new Set(fields.map((f) => f.productId));
  const available = products.filter((p) => !usedIds.has(p.id));

  function submit(mode: "draft" | "validate") {
    setFormError(null);
    form.handleSubmit(
      (values) => {
        setPendingMode(mode);
        startTransition(async () => {
          const result = await createAdjustment(values, mode);
          if (!result.ok) {
            setFormError(result.error);
            toast.error(result.error);
            setPendingMode(null);
            return;
          }
          toast.success(result.message ?? "Saved.");
          router.push(`/operations/adjustments/${result.data!.id}`);
        });
      },
      () => setFormError("Please fix the highlighted fields."),
    )();
  }

  return (
    <form className="space-y-6" onSubmit={(e) => e.preventDefault()} noValidate>
      {formError && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </div>
      )}

      <div className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2">
        <Field data-invalid={!!errors.warehouseId}>
          <FieldLabel>Warehouse</FieldLabel>
          <NativeSelect
            value={warehouseId}
            onChange={(e) => {
              form.setValue("warehouseId", e.target.value, { shouldValidate: true });
              form.setValue("locationId", "", { shouldValidate: true });
            }}
          >
            <NativeSelectOption value="">Select warehouse…</NativeSelectOption>
            {warehouses.map((w) => (
              <NativeSelectOption key={w.id} value={w.id}>{w.name}</NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldError errors={[errors.warehouseId]} />
        </Field>
        <Field data-invalid={!!errors.locationId}>
          <FieldLabel>Location</FieldLabel>
          <NativeSelect
            value={locationId}
            disabled={!warehouseId}
            onChange={(e) => form.setValue("locationId", e.target.value, { shouldValidate: true })}
          >
            <NativeSelectOption value="">Select location…</NativeSelectOption>
            {availableLocations.map((l) => (
              <NativeSelectOption key={l.id} value={l.id}>{l.name}</NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldError errors={[errors.locationId]} />
        </Field>
        <Field data-invalid={!!errors.reason}>
          <FieldLabel>Reason</FieldLabel>
          <NativeSelect {...form.register("reason")}>
            <NativeSelectOption value="">Select reason…</NativeSelectOption>
            {ADJUSTMENT_REASONS.map((r) => (
              <NativeSelectOption key={r.value} value={r.value}>{r.label}</NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldError errors={[errors.reason]} />
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel>Notes</FieldLabel>
          <Textarea rows={2} {...form.register("notes")} />
        </Field>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Products</h3>
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger
              render={
                <Button type="button" variant="outline" size="sm">
                  <Plus /> Add product
                </Button>
              }
            />
            <PopoverContent align="end" className="w-80 p-0">
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
                          append({ productId: p.id, countedQuantity: 0 });
                          setPickerOpen(false);
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
        </div>

        {fields.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">No products added yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>System Quantity</TableHead>
                <TableHead className="w-36">Physical Count</TableHead>
                <TableHead>Difference</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((f, i) => {
                const product = byId.get(f.productId);
                if (!product) return null;
                return (
                  <AdjustmentLineRow
                    key={f.id}
                    product={product}
                    locationId={locationId}
                    countedQuantity={f.countedQuantity}
                    onCountedChange={(v) => update(i, { ...f, countedQuantity: v })}
                    onRemove={() => remove(i)}
                  />
                );
              })}
            </TableBody>
          </Table>
        )}
        {errors.items?.message && <p className="mt-2 text-sm text-destructive">{errors.items.message}</p>}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.push("/operations/adjustments")} disabled={isPending}>
          Cancel
        </Button>
        <Button type="button" variant="secondary" disabled={isPending} onClick={() => submit("draft")}>
          {isPending && pendingMode === "draft" && <Loader2 className="animate-spin" />} Save as Draft
        </Button>
        <Button type="button" disabled={isPending} onClick={() => submit("validate")}>
          {isPending && pendingMode === "validate" && <Loader2 className="animate-spin" />} Validate
        </Button>
      </div>
    </form>
  );
}
