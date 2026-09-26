"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { signUp } from "@/actions/auth";
import { signupSchema, type SignupInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";

export function SignupForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: "", email: "", loginId: "", password: "", confirmPassword: "" },
  });

  function onSubmit(values: SignupInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await signUp(values);
      if (result) {
        if (!result.ok) {
          setFormError(result.error);
          toast.error(result.error);
          if (result.fieldErrors) {
            for (const [field, message] of Object.entries(result.fieldErrors)) {
              form.setError(field as keyof SignupInput, { message });
            }
          }
        } else if (result.message) {
          setSuccessMessage(result.message);
          toast.success(result.message);
        }
      }
    });
  }

  if (successMessage) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border bg-accent/40 px-6 py-8 text-center">
        <div className="rounded-full bg-primary/10 p-3 text-primary">
          <CheckCircle2 className="size-6" aria-hidden="true" />
        </div>
        <p className="text-sm text-foreground">{successMessage}</p>
        <Button render={<Link href="/login" />}>Back to login</Button>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        {formError && (
          <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        )}

        <Field data-invalid={!!form.formState.errors.fullName}>
          <FieldLabel htmlFor="fullName">Full Name</FieldLabel>
          <Input id="fullName" autoComplete="name" placeholder="Jane Doe" aria-invalid={!!form.formState.errors.fullName} {...form.register("fullName")} />
          <FieldError errors={[form.formState.errors.fullName]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.email}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" type="email" autoComplete="email" placeholder="you@company.com" aria-invalid={!!form.formState.errors.email} {...form.register("email")} />
          <FieldError errors={[form.formState.errors.email]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.loginId}>
          <FieldLabel htmlFor="loginId">Login ID</FieldLabel>
          <Input id="loginId" autoComplete="username" placeholder="jdoe" aria-invalid={!!form.formState.errors.loginId} {...form.register("loginId")} />
          <FieldError errors={[form.formState.errors.loginId]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.password}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              aria-invalid={!!form.formState.errors.password}
              className="pr-9"
              {...form.register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground hover:text-foreground"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <FieldError errors={[form.formState.errors.password]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.confirmPassword}>
          <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              aria-invalid={!!form.formState.errors.confirmPassword}
              className="pr-9"
              {...form.register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground hover:text-foreground"
              tabIndex={-1}
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <FieldError errors={[form.formState.errors.confirmPassword]} />
        </Field>

        <Button type="submit" size="lg" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Create Account
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </FieldGroup>
    </form>
  );
}
