"use client";

import { useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createSupplier, updateSupplier } from "@/actions/suppliers";
import { supplierSchema, type SupplierInput } from "@/lib/validations/suppliers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Supplier = { id: string; name: string; contact_person: string | null; phone: string | null; email: string | null; address: string | null };

/** Create/edit dialog for a supplier. Pass `supplier` for edit mode. */
export function SupplierFormDialog({ trigger, supplier }: { trigger: ReactElement; supplier?: Supplier }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const form = useForm<SupplierInput>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: supplier?.name ?? "",
      contactPerson: supplier?.contact_person ?? "",
      phone: supplier?.phone ?? "",
      email: supplier?.email ?? "",
      address: supplier?.address ?? "",
    },
  });

  async function onSubmit(values: SupplierInput) {
    setPending(true);
    try {
      const result = supplier ? await updateSupplier(supplier.id, values) : await createSupplier(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Saved.");
      setOpen(false);
      form.reset();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) form.reset({ name: supplier?.name ?? "", contactPerson: supplier?.contact_person ?? "", phone: supplier?.phone ?? "", email: supplier?.email ?? "", address: supplier?.address ?? "" }); }}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <DialogHeader>
            <DialogTitle>{supplier ? "Edit Supplier" : "New Supplier"}</DialogTitle>
          </DialogHeader>
          <FieldGroup className="my-4">
            <Field data-invalid={!!form.formState.errors.name}>
              <FieldLabel htmlFor="s-name">Name</FieldLabel>
              <Input id="s-name" {...form.register("name")} />
              <FieldError errors={[form.formState.errors.name]} />
            </Field>
            <Field data-invalid={!!form.formState.errors.contactPerson}>
              <FieldLabel htmlFor="s-contact">Contact Person</FieldLabel>
              <Input id="s-contact" {...form.register("contactPerson")} />
              <FieldError errors={[form.formState.errors.contactPerson]} />
            </Field>
            <Field data-invalid={!!form.formState.errors.phone}>
              <FieldLabel htmlFor="s-phone">Phone</FieldLabel>
              <Input id="s-phone" {...form.register("phone")} />
              <FieldError errors={[form.formState.errors.phone]} />
            </Field>
            <Field data-invalid={!!form.formState.errors.email}>
              <FieldLabel htmlFor="s-email">Email</FieldLabel>
              <Input id="s-email" type="email" {...form.register("email")} />
              <FieldError errors={[form.formState.errors.email]} />
            </Field>
            <Field data-invalid={!!form.formState.errors.address}>
              <FieldLabel htmlFor="s-address">Address</FieldLabel>
              <Input id="s-address" {...form.register("address")} />
              <FieldError errors={[form.formState.errors.address]} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} {supplier ? "Save Changes" : "Create Supplier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
