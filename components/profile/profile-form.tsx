"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { updateProfile } from "@/actions/profile";
import { updateProfileSchema, type UpdateProfileInput } from "@/lib/validations/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";

export function ProfileForm({ defaultValues }: { defaultValues: UpdateProfileInput }) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues,
  });

  function onSubmit(values: UpdateProfileInput) {
    startTransition(async () => {
      const result = await updateProfile(values);
      if (result.ok) {
        toast.success(result.message ?? "Profile updated.");
        form.reset(values);
      } else {
        toast.error(result.error);
        if (result.fieldErrors) {
          for (const [field, message] of Object.entries(result.fieldErrors)) {
            form.setError(field as keyof UpdateProfileInput, { message });
          }
        }
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field data-invalid={!!form.formState.errors.fullName}>
          <FieldLabel htmlFor="fullName">Full Name</FieldLabel>
          <Input id="fullName" aria-invalid={!!form.formState.errors.fullName} {...form.register("fullName")} />
          <FieldError errors={[form.formState.errors.fullName]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.phone}>
          <FieldLabel htmlFor="phone">Phone</FieldLabel>
          <Input id="phone" placeholder="+91 98765 43210" aria-invalid={!!form.formState.errors.phone} {...form.register("phone")} />
          <FieldError errors={[form.formState.errors.phone]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.avatarUrl}>
          <FieldLabel htmlFor="avatarUrl">Avatar URL</FieldLabel>
          <Input id="avatarUrl" placeholder="https://..." aria-invalid={!!form.formState.errors.avatarUrl} {...form.register("avatarUrl")} />
          <FieldError errors={[form.formState.errors.avatarUrl]} />
        </Field>

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending || !form.formState.isDirty}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
