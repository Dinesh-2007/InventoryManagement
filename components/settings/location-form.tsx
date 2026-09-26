"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createLocation, updateLocation } from "@/actions/locations";
import { locationSchema, type LocationInput } from "@/lib/validations/warehouses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";

type WarehouseOption = { id: string; name: string };

export function LocationForm({
  warehouses,
  location,
}: {
  warehouses: WarehouseOption[];
  location?: { id: string; name: string; short_code: string; warehouse_id: string };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<LocationInput>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: location?.name ?? "",
      shortCode: location?.short_code ?? "",
      warehouseId: location?.warehouse_id ?? "",
    },
  });

  function onSubmit(values: LocationInput) {
    startTransition(async () => {
      const result = location ? await updateLocation(location.id, values) : await createLocation(values);
      if (!result.ok) {
        toast.error(result.error);
        if (result.fieldErrors) {
          for (const [field, message] of Object.entries(result.fieldErrors)) {
            form.setError(field as keyof LocationInput, { message });
          }
        }
        return;
      }
      toast.success(result.message ?? "Saved.");
      router.push("/settings/locations");
      router.refresh();
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="max-w-lg rounded-xl border bg-card p-4">
      <FieldGroup>
        <Field data-invalid={!!form.formState.errors.warehouseId}>
          <FieldLabel htmlFor="warehouseId">Warehouse</FieldLabel>
          <NativeSelect id="warehouseId" disabled={!!location} {...form.register("warehouseId")}>
            <NativeSelectOption value="">Select warehouse…</NativeSelectOption>
            {warehouses.map((w) => (
              <NativeSelectOption key={w.id} value={w.id}>{w.name}</NativeSelectOption>
            ))}
          </NativeSelect>
          {location && <FieldDescription>A location cannot be moved to another warehouse. Create a new one instead.</FieldDescription>}
          <FieldError errors={[form.formState.errors.warehouseId]} />
        </Field>
        <Field data-invalid={!!form.formState.errors.name}>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input id="name" {...form.register("name")} />
          <FieldError errors={[form.formState.errors.name]} />
        </Field>
        <Field data-invalid={!!form.formState.errors.shortCode}>
          <FieldLabel htmlFor="shortCode">Short Code</FieldLabel>
          <Input id="shortCode" className="uppercase" {...form.register("shortCode")} />
          <FieldError errors={[form.formState.errors.shortCode]} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push("/settings/locations")} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="animate-spin" />} {location ? "Save Changes" : "Create Location"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
