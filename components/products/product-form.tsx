"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Field, FieldLabel, FieldError, FieldGroup, FieldDescription } from "@/components/ui/field";
import { createProduct, updateProduct } from "@/actions/products";
import { skuRegex, type ProductInput, type ProductUpdateInput } from "@/lib/validations/products";

export type CategoryOption = { id: string; name: string };
export type LocationOption = { id: string; label: string };

export type ProductFormValues = {
  name: string;
  sku: string;
  category_id: string;
  unit_of_measure: string;
  per_unit_cost: string;
  reorder_point: string;
  reorder_quantity: string;
  initial_stock: string;
  initial_location_id: string;
  description: string;
};

const num = (v: string) => (v.trim() === "" ? 0 : Number(v));

/**
 * Shared by /products/new and /products/[id]/edit. Client-side registration
 * rules give immediate feedback; the server action (createProduct/updateProduct)
 * re-validates with zod and is the source of truth for errors (incl. duplicate
 * SKU, surfaced under the SKU field via `fieldErrors`).
 */
export function ProductForm({
  mode,
  product,
  categories,
  locations,
}: {
  mode: "create" | "edit";
  product?: {
    id: string;
    name: string;
    sku: string;
    category_id: string;
    unit_of_measure: string;
    per_unit_cost: number;
    reorder_point: number;
    reorder_quantity: number;
    description: string | null;
  };
  categories: CategoryOption[];
  locations: LocationOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<ProductFormValues>({
    defaultValues:
      mode === "edit" && product
        ? {
            name: product.name,
            sku: product.sku,
            category_id: product.category_id,
            unit_of_measure: product.unit_of_measure,
            per_unit_cost: String(product.per_unit_cost),
            reorder_point: String(product.reorder_point),
            reorder_quantity: String(product.reorder_quantity),
            initial_stock: "0",
            initial_location_id: "",
            description: product.description ?? "",
          }
        : {
            name: "",
            sku: "",
            category_id: "",
            unit_of_measure: "",
            per_unit_cost: "0",
            reorder_point: "0",
            reorder_quantity: "0",
            initial_stock: "0",
            initial_location_id: "",
            description: "",
          },
  });

  const initialStock = form.watch("initial_stock");
  const showLocationField = mode === "create" && num(initialStock) > 0;

  function onSubmit(values: ProductFormValues) {
    setServerError(null);
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createProduct({
              name: values.name,
              sku: values.sku,
              category_id: values.category_id,
              unit_of_measure: values.unit_of_measure,
              per_unit_cost: num(values.per_unit_cost),
              reorder_point: num(values.reorder_point),
              reorder_quantity: num(values.reorder_quantity),
              initial_stock: num(values.initial_stock),
              initial_location_id: values.initial_location_id || undefined,
              description: values.description || undefined,
            } satisfies ProductInput)
          : await updateProduct(product!.id, {
              name: values.name,
              sku: values.sku,
              category_id: values.category_id,
              unit_of_measure: values.unit_of_measure,
              per_unit_cost: num(values.per_unit_cost),
              reorder_point: num(values.reorder_point),
              reorder_quantity: num(values.reorder_quantity),
              description: values.description || undefined,
            } satisfies ProductUpdateInput);

      if (!result.ok) {
        setServerError(result.error);
        if (result.fieldErrors) {
          for (const [field, message] of Object.entries(result.fieldErrors)) {
            form.setError(field as keyof ProductFormValues, { type: "server", message });
          }
        }
        toast.error(result.error);
      }
      // On success the action redirects; nothing else to do here.
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <FieldGroup>
        <Field data-invalid={!!form.formState.errors.name}>
          <FieldLabel htmlFor="name">Product Name</FieldLabel>
          <Input
            id="name"
            autoComplete="off"
            aria-invalid={!!form.formState.errors.name}
            {...form.register("name", { required: "Product name is required" })}
          />
          <FieldError errors={[form.formState.errors.name]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.sku}>
          <FieldLabel htmlFor="sku">SKU / Code</FieldLabel>
          <Input
            id="sku"
            autoComplete="off"
            placeholder="e.g. ST-001"
            aria-invalid={!!form.formState.errors.sku}
            {...form.register("sku", {
              required: "SKU is required",
              pattern: { value: skuRegex, message: "1–40 characters: letters, numbers, dot, dash, underscore or slash" },
            })}
          />
          <FieldDescription>Saved in upper case.</FieldDescription>
          <FieldError errors={[form.formState.errors.sku]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.category_id}>
          <FieldLabel htmlFor="category_id">Category</FieldLabel>
          <NativeSelect
            id="category_id"
            aria-invalid={!!form.formState.errors.category_id}
            {...form.register("category_id", { required: "Select a category" })}
          >
            <NativeSelectOption value="">Select a category…</NativeSelectOption>
            {categories.map((c) => (
              <NativeSelectOption key={c.id} value={c.id}>{c.name}</NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldError errors={[form.formState.errors.category_id]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.unit_of_measure}>
          <FieldLabel htmlFor="unit_of_measure">Unit of Measure</FieldLabel>
          <Input
            id="unit_of_measure"
            placeholder="e.g. pcs, kg, box"
            aria-invalid={!!form.formState.errors.unit_of_measure}
            {...form.register("unit_of_measure", { required: "Unit of measure is required" })}
          />
          <FieldError errors={[form.formState.errors.unit_of_measure]} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!form.formState.errors.reorder_point}>
            <FieldLabel htmlFor="reorder_point">Reorder Point</FieldLabel>
            <Input
              id="reorder_point"
              type="number"
              step="0.001"
              min="0"
              aria-invalid={!!form.formState.errors.reorder_point}
              {...form.register("reorder_point", {
                validate: (v) => Number(v) >= 0 || "Must be 0 or more",
              })}
            />
            <FieldError errors={[form.formState.errors.reorder_point]} />
          </Field>
          <Field data-invalid={!!form.formState.errors.reorder_quantity}>
            <FieldLabel htmlFor="reorder_quantity">Reorder Quantity</FieldLabel>
            <Input
              id="reorder_quantity"
              type="number"
              step="0.001"
              min="0"
              aria-invalid={!!form.formState.errors.reorder_quantity}
              {...form.register("reorder_quantity", {
                validate: (v) => Number(v) >= 0 || "Must be 0 or more",
              })}
            />
            <FieldError errors={[form.formState.errors.reorder_quantity]} />
          </Field>
        </div>

        <Field data-invalid={!!form.formState.errors.per_unit_cost}>
          <FieldLabel htmlFor="per_unit_cost">Per Unit Cost (₹)</FieldLabel>
          <Input
            id="per_unit_cost"
            type="number"
            step="0.01"
            min="0"
            aria-invalid={!!form.formState.errors.per_unit_cost}
            {...form.register("per_unit_cost", {
              validate: (v) => Number(v) >= 0 || "Must be 0 or more",
            })}
          />
          <FieldError errors={[form.formState.errors.per_unit_cost]} />
        </Field>

        {mode === "create" && (
          <>
            <Field data-invalid={!!form.formState.errors.initial_stock}>
              <FieldLabel htmlFor="initial_stock">Initial Stock (optional)</FieldLabel>
              <Input
                id="initial_stock"
                type="number"
                step="0.001"
                min="0"
                aria-invalid={!!form.formState.errors.initial_stock}
                {...form.register("initial_stock", {
                  validate: (v) => Number(v) >= 0 || "Must be 0 or more",
                })}
              />
              <FieldDescription>Booked as an initial-stock adjustment at the location below.</FieldDescription>
              <FieldError errors={[form.formState.errors.initial_stock]} />
            </Field>

            {showLocationField && (
              <Field data-invalid={!!form.formState.errors.initial_location_id}>
                <FieldLabel htmlFor="initial_location_id">Location</FieldLabel>
                <NativeSelect
                  id="initial_location_id"
                  aria-invalid={!!form.formState.errors.initial_location_id}
                  {...form.register("initial_location_id", {
                    validate: (v) => (num(form.getValues("initial_stock")) > 0 && !v ? "Select a location to book the initial stock" : true),
                  })}
                >
                  <NativeSelectOption value="">Select a location…</NativeSelectOption>
                  {locations.map((l) => (
                    <NativeSelectOption key={l.id} value={l.id}>{l.label}</NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldError errors={[form.formState.errors.initial_location_id]} />
              </Field>
            )}
          </>
        )}

        <Field>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea id="description" rows={3} {...form.register("description")} />
          <FieldError errors={[form.formState.errors.description]} />
        </Field>
      </FieldGroup>

      {serverError && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Save Product
        </Button>
      </div>
    </form>
  );
}
