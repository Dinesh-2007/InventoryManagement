"use client";

import { useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createCustomer, updateCustomer, customerSchema, type CustomerInput } from "@/actions/customers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Customer = { id: string; name: string; contact_person: string | null; phone: string | null; email: string | null; address: string | null };

/** Create/edit dialog for a customer. Pass `customer` for edit mode. */
export function CustomerFormDialog({ trigger, customer }: { trigger: ReactElement; customer?: Customer }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const form = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: customer?.name ?? "",
      contactPerson: customer?.contact_person ?? "",
      phone: customer?.phone ?? "",
      email: customer?.email ?? "",
      address: customer?.address ?? "",
    },
  });

  async function onSubmit(values: CustomerInput) {
    setPending(true);
    try {
      const result = customer ? await updateCustomer(customer.id, values) : await createCustomer(values);
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
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) form.reset({ name: customer?.name ?? "", contactPerson: customer?.contact_person ?? "", phone: customer?.phone ?? "", email: customer?.email ?? "", address: customer?.address ?? "" }); }}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <DialogHeader>
            <DialogTitle>{customer ? "Edit Customer" : "New Customer"}</DialogTitle>
          </DialogHeader>
          <FieldGroup className="my-4">
            <Field data-invalid={!!form.formState.errors.name}>
              <FieldLabel htmlFor="c-name">Name</FieldLabel>
              <Input id="c-name" {...form.register("name")} />
              <FieldError errors={[form.formState.errors.name]} />
            </Field>
            <Field data-invalid={!!form.formState.errors.contactPerson}>
              <FieldLabel htmlFor="c-contact">Contact Person</FieldLabel>
              <Input id="c-contact" {...form.register("contactPerson")} />
              <FieldError errors={[form.formState.errors.contactPerson]} />
            </Field>
            <Field data-invalid={!!form.formState.errors.phone}>
              <FieldLabel htmlFor="c-phone">Phone</FieldLabel>
              <Input id="c-phone" {...form.register("phone")} />
              <FieldError errors={[form.formState.errors.phone]} />
            </Field>
            <Field data-invalid={!!form.formState.errors.email}>
              <FieldLabel htmlFor="c-email">Email</FieldLabel>
              <Input id="c-email" type="email" {...form.register("email")} />
              <FieldError errors={[form.formState.errors.email]} />
            </Field>
            <Field data-invalid={!!form.formState.errors.address}>
              <FieldLabel htmlFor="c-address">Address</FieldLabel>
              <Input id="c-address" {...form.register("address")} />
              <FieldError errors={[form.formState.errors.address]} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} {customer ? "Save Changes" : "Create Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
