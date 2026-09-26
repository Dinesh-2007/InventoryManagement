"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createWarehouse, updateWarehouse } from "@/actions/warehouses";
import { warehouseSchema, type WarehouseInput } from "@/lib/validations/warehouses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";

export function WarehouseForm({ warehouse }: { warehouse?: { id: string; name: string; short_code: string; address: string | null } }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<WarehouseInput>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: { name: warehouse?.name ?? "", shortCode: warehouse?.short_code ?? "", address: warehouse?.address ?? "" },
  });

  function onSubmit(values: WarehouseInput) {
    startTransition(async () => {
      const result = warehouse ? await updateWarehouse(warehouse.id, values) : await createWarehouse(values);
      if (!result.ok) {
        toast.error(result.error);
        if (result.fieldErrors) {
          for (const [field, message] of Object.entries(result.fieldErrors)) {
            form.setError(field as keyof WarehouseInput, { message });
          }
        }
        return;
      }
      toast.success(result.message ?? "Saved.");
      router.push("/settings/warehouses");
      router.refresh();
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="max-w-lg rounded-xl border bg-card p-4">
      <FieldGroup>
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
        <Field data-invalid={!!form.formState.errors.address}>
          <FieldLabel htmlFor="address">Address</FieldLabel>
          <Input id="address" {...form.register("address")} />
          <FieldError errors={[form.formState.errors.address]} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push("/settings/warehouses")} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="animate-spin" />} {warehouse ? "Save Changes" : "Create Warehouse"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
