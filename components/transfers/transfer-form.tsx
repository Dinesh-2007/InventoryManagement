"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createTransfer } from "@/actions/transfers";
import { transferSchema, type TransferInput } from "@/lib/validations/transfers";
import { businessToday } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ProductLinePicker, type ProductOption } from "./product-line-picker";

type WarehouseOption = { id: string; name: string; short_code: string };
type LocationOption = { id: string; name: string; short_code: string; warehouse_id: string };
type ProfileOption = { id: string; full_name: string };

export function TransferForm({
  warehouses,
  locations,
  products,
  profiles,
  currentUserId,
}: {
  warehouses: WarehouseOption[];
  locations: LocationOption[];
  products: ProductOption[];
  profiles: ProfileOption[];
  currentUserId: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingMode, setPendingMode] = useState<"draft" | "validate" | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<TransferInput>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      sourceWarehouseId: "",
      sourceLocationId: "",
      destWarehouseId: "",
      destLocationId: "",
      scheduledDate: businessToday(),
      responsibleId: currentUserId ?? "",
      notes: "",
      items: [],
    },
  });

  const { fields, append, remove, update } = useFieldArray({ control: form.control, name: "items" });
  const errors = form.formState.errors;

  const sourceWarehouseId = form.watch("sourceWarehouseId");
  const destWarehouseId = form.watch("destWarehouseId");
  const sourceLocationId = form.watch("sourceLocationId");
  const destLocationId = form.watch("destLocationId");
  const sourceLocations = locations.filter((l) => l.warehouse_id === sourceWarehouseId);
  const destLocations = locations.filter((l) => l.warehouse_id === destWarehouseId);

  function submit(mode: "draft" | "validate") {
    setFormError(null);
    form.handleSubmit(
      (values) => {
        setPendingMode(mode);
        startTransition(async () => {
          const result = await createTransfer(values, mode);
          if (!result.ok) {
            setFormError(result.error);
            toast.error(result.error);
            setPendingMode(null);
            return;
          }
          toast.success(result.message ?? "Saved.");
          router.push(`/operations/transfers/${result.data!.id}`);
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

      <div className="grid gap-6 rounded-xl border bg-card p-4 sm:grid-cols-2">
        <FieldGroup>
          <h3 className="text-sm font-semibold">Source</h3>
          <Field data-invalid={!!errors.sourceWarehouseId}>
            <FieldLabel>Warehouse</FieldLabel>
            <NativeSelect
              value={sourceWarehouseId}
              onChange={(e) => {
                form.setValue("sourceWarehouseId", e.target.value, { shouldValidate: true });
                form.setValue("sourceLocationId", "", { shouldValidate: true });
              }}
            >
              <NativeSelectOption value="">Select warehouse…</NativeSelectOption>
              {warehouses.map((w) => (
                <NativeSelectOption key={w.id} value={w.id}>{w.name}</NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldError errors={[errors.sourceWarehouseId]} />
          </Field>
          <Field data-invalid={!!errors.sourceLocationId}>
            <FieldLabel>Location</FieldLabel>
            <NativeSelect
              value={sourceLocationId}
              disabled={!sourceWarehouseId}
              onChange={(e) => form.setValue("sourceLocationId", e.target.value, { shouldValidate: true })}
            >
              <NativeSelectOption value="">Select location…</NativeSelectOption>
              {sourceLocations.map((l) => (
                <NativeSelectOption key={l.id} value={l.id}>{l.name}</NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldError errors={[errors.sourceLocationId]} />
          </Field>
        </FieldGroup>

        <FieldGroup>
          <h3 className="text-sm font-semibold">Destination</h3>
          <Field data-invalid={!!errors.destWarehouseId}>
            <FieldLabel>Warehouse</FieldLabel>
            <NativeSelect
              value={destWarehouseId}
              onChange={(e) => {
                form.setValue("destWarehouseId", e.target.value, { shouldValidate: true });
                form.setValue("destLocationId", "", { shouldValidate: true });
              }}
            >
              <NativeSelectOption value="">Select warehouse…</NativeSelectOption>
              {warehouses.map((w) => (
                <NativeSelectOption key={w.id} value={w.id}>{w.name}</NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldError errors={[errors.destWarehouseId]} />
          </Field>
          <Field data-invalid={!!errors.destLocationId}>
            <FieldLabel>Location</FieldLabel>
            <NativeSelect
              value={destLocationId}
              disabled={!destWarehouseId}
              onChange={(e) => form.setValue("destLocationId", e.target.value, { shouldValidate: true })}
            >
              <NativeSelectOption value="">Select location…</NativeSelectOption>
              {destLocations.map((l) => (
                <NativeSelectOption key={l.id} value={l.id}>{l.name}</NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldError errors={[errors.destLocationId]} />
          </Field>
        </FieldGroup>
      </div>

      <div className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2">
        <Field>
          <FieldLabel>Schedule Date</FieldLabel>
          <Input type="date" {...form.register("scheduledDate")} />
          <FieldError errors={[errors.scheduledDate]} />
        </Field>
        <Field>
          <FieldLabel>Responsible</FieldLabel>
          <NativeSelect {...form.register("responsibleId")}>
            <NativeSelectOption value="">Unassigned</NativeSelectOption>
            {profiles.map((p) => (
              <NativeSelectOption key={p.id} value={p.id}>{p.full_name}</NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel>Notes</FieldLabel>
          <Textarea rows={2} {...form.register("notes")} />
        </Field>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Products</h3>
        <ProductLinePicker
          products={products}
          lines={fields.map((f) => ({ productId: f.productId, quantity: f.quantity }))}
          onAdd={(productId) => append({ productId, quantity: 1 })}
          onRemove={(index) => remove(index)}
          onQuantityChange={(index, quantity) => update(index, { ...fields[index], quantity })}
        />
        {errors.items?.message && <p className="mt-2 text-sm text-destructive">{errors.items.message}</p>}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.push("/operations/transfers")} disabled={isPending}>
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
