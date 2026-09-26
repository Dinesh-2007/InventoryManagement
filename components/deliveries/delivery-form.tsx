"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Loader2, Plus, Printer } from "lucide-react";
import { toast } from "sonner";

import { createDelivery } from "@/actions/deliveries";
import { deliverySchema, deliveryOperationTypes, deliveryOperationTypeLabels, type DeliveryInput } from "@/lib/validations/deliveries";

type DeliveryFormValues = z.input<typeof deliverySchema>;
import { businessToday } from "@/lib/format";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type PickableProduct } from "@/components/operations/product-picker";
import { DeliveryLineRow } from "@/components/deliveries/delivery-line-row";

type Option = { id: string; name: string };
type LocationOption = { id: string; name: string; warehouse_id: string };
type ProfileOption = { id: string; full_name: string };
type CustomerOption = { id: string; name: string; address: string | null };

export function DeliveryForm({
  customers,
  warehouses,
  locations,
  products,
  profiles,
  currentUserId,
}: {
  customers: CustomerOption[];
  warehouses: Option[];
  locations: LocationOption[];
  products: PickableProduct[];
  profiles: ProfileOption[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"draft" | "validate" | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<DeliveryFormValues, unknown, DeliveryInput>({
    resolver: zodResolver(deliverySchema),
    defaultValues: {
      customer_id: null,
      delivery_address: "",
      operation_type: "sales_order",
      warehouse_id: "",
      location_id: "",
      scheduled_date: businessToday(),
      responsible_id: currentUserId,
      notes: "",
      items: [{ product_id: "", quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const warehouseId = form.watch("warehouse_id");
  const items = form.watch("items");
  const filteredLocations = locations.filter((l) => l.warehouse_id === warehouseId);
  const itemsRootError =
    form.formState.errors.items?.root?.message ?? (typeof form.formState.errors.items?.message === "string" ? form.formState.errors.items.message : undefined);

  function submit(values: DeliveryInput, mode: "draft" | "validate") {
    setFormError(null);
    setPendingAction(mode);
    startTransition(async () => {
      const result = await createDelivery(values, { validate: mode === "validate" });
      setPendingAction(null);
      if (!result.ok) {
        setFormError(result.error);
        toast.error(result.error);
        return;
      }
      if (result.message) {
        toast.warning(result.message);
      } else if (mode === "draft") {
        toast.success("Delivery saved as draft.");
      } else if (result.data!.status === "waiting") {
        toast.warning("Delivery created — Waiting for stock.");
      } else {
        toast.success("Delivery created — Ready to dispatch.");
      }
      router.push(`/operations/deliveries/${result.data!.id}`);
    });
  }

  return (
    <form noValidate onSubmit={(e) => e.preventDefault()} className="space-y-6">
      {formError && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </div>
      )}

      <div className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="reference">Reference</FieldLabel>
          <Input id="reference" disabled value="Will be generated (WH/OUT/0001)" />
        </Field>

        <Field>
          <FieldLabel htmlFor="operation_type">Operation Type</FieldLabel>
          <Controller
            control={form.control}
            name="operation_type"
            render={({ field }) => (
              <NativeSelect id="operation_type" value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                {deliveryOperationTypes.map((t) => (
                  <NativeSelectOption key={t} value={t}>
                    {deliveryOperationTypeLabels[t]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            )}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="customer_id">Customer (optional)</FieldLabel>
          <Controller
            control={form.control}
            name="customer_id"
            render={({ field }) => (
              <NativeSelect
                id="customer_id"
                value={field.value ?? ""}
                onChange={(e) => {
                  const customerId = e.target.value || null;
                  field.onChange(customerId);
                  const customer = customers.find((c) => c.id === customerId);
                  if (customer?.address && !form.getValues("delivery_address")) {
                    form.setValue("delivery_address", customer.address);
                  }
                }}
              >
                <NativeSelectOption value="">No customer link</NativeSelectOption>
                {customers.map((c) => (
                  <NativeSelectOption key={c.id} value={c.id}>
                    {c.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            )}
          />
        </Field>

        <Field data-invalid={!!form.formState.errors.delivery_address} className="sm:col-span-2">
          <FieldLabel htmlFor="delivery_address">Delivery Address</FieldLabel>
          <Textarea id="delivery_address" rows={2} aria-invalid={!!form.formState.errors.delivery_address} {...form.register("delivery_address")} />
          <FieldError errors={[form.formState.errors.delivery_address]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.warehouse_id}>
          <FieldLabel htmlFor="warehouse_id">Warehouse</FieldLabel>
          <Controller
            control={form.control}
            name="warehouse_id"
            render={({ field }) => (
              <NativeSelect
                id="warehouse_id"
                aria-invalid={!!form.formState.errors.warehouse_id}
                value={field.value}
                onChange={(e) => {
                  field.onChange(e.target.value);
                  form.setValue("location_id", "");
                }}
              >
                <NativeSelectOption value="">Select a warehouse…</NativeSelectOption>
                {warehouses.map((w) => (
                  <NativeSelectOption key={w.id} value={w.id}>
                    {w.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            )}
          />
          <FieldError errors={[form.formState.errors.warehouse_id]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.location_id}>
          <FieldLabel htmlFor="location_id">Location (source)</FieldLabel>
          <Controller
            control={form.control}
            name="location_id"
            render={({ field }) => (
              <NativeSelect
                id="location_id"
                disabled={!warehouseId}
                aria-invalid={!!form.formState.errors.location_id}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
              >
                <NativeSelectOption value="">{warehouseId ? "Select a location…" : "Select a warehouse first"}</NativeSelectOption>
                {filteredLocations.map((l) => (
                  <NativeSelectOption key={l.id} value={l.id}>
                    {l.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            )}
          />
          <FieldError errors={[form.formState.errors.location_id]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.scheduled_date}>
          <FieldLabel htmlFor="scheduled_date">Schedule Date</FieldLabel>
          <Input
            id="scheduled_date"
            type="date"
            aria-invalid={!!form.formState.errors.scheduled_date}
            {...form.register("scheduled_date")}
          />
          <FieldError errors={[form.formState.errors.scheduled_date]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="responsible_id">Responsible</FieldLabel>
          <Controller
            control={form.control}
            name="responsible_id"
            render={({ field }) => (
              <NativeSelect id="responsible_id" value={field.value ?? currentUserId} onChange={(e) => field.onChange(e.target.value)}>
                {profiles.map((p) => (
                  <NativeSelectOption key={p.id} value={p.id}>
                    {p.id === currentUserId ? `${p.full_name} (you)` : p.full_name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            )}
          />
          <p className="text-xs text-muted-foreground">Auto-filled with the current logged-in user — reassign if needed.</p>
        </Field>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Products</h3>
          <Button type="button" variant="outline" size="sm" onClick={() => append({ product_id: "", quantity: 1 })}>
            <Plus /> Add Product
          </Button>
        </div>
        {itemsRootError && <p className="mb-2 text-sm text-destructive">{itemsRootError}</p>}
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="w-32">Quantity</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field, index) => {
                const excludeIds = (items ?? [])
                  .filter((_, i) => i !== index)
                  .map((i) => i.product_id)
                  .filter(Boolean);
                return (
                  <DeliveryLineRow
                    key={field.id}
                    index={index}
                    control={form.control}
                    errors={form.formState.errors}
                    products={products}
                    excludeIds={excludeIds}
                    locationId={form.watch("location_id")}
                    canRemove={fields.length > 1}
                    onRemove={() => remove(index)}
                  />
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <Field>
        <FieldLabel htmlFor="notes">Notes</FieldLabel>
        <Textarea id="notes" rows={3} placeholder="Optional notes for this delivery…" {...form.register("notes")} />
      </Field>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
        <Link href="/operations/deliveries" className={buttonVariants({ variant: "outline" })}>
          Cancel
        </Link>
        <Button type="button" variant="outline" disabled title="Save the delivery first to print it">
          <Printer /> Print
        </Button>
        <Button type="button" variant="secondary" disabled={isPending} onClick={form.handleSubmit((v) => submit(v, "draft"))}>
          {isPending && pendingAction === "draft" && <Loader2 className="animate-spin" />}
          Save as Draft
        </Button>
        <Button type="button" disabled={isPending} onClick={form.handleSubmit((v) => submit(v, "validate"))}>
          {isPending && pendingAction === "validate" && <Loader2 className="animate-spin" />}
          Validate
        </Button>
      </div>
    </form>
  );
}
