"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Eye, EyeOff, Loader2, BarChart3, Warehouse } from "lucide-react";
import { toast } from "sonner";

import { clerkSignUp } from "@/actions/auth-clerk";
import { signupSchema, type SignupInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

const ROLES = [
  {
    value: "inventory_manager" as const,
    label: "Inventory Manager",
    description: "Full access to inventory, reports and settings",
    icon: BarChart3,
  },
  {
    value: "warehouse_staff" as const,
    label: "Warehouse Staff",
    description: "Operational tasks: picking, shelving and transfers",
    icon: Warehouse,
  },
];

export function SignupForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      loginId: "",
      role: undefined,
      password: "",
      confirmPassword: "",
    },
  });

  const selectedRole = form.watch("role");

  function onSubmit(values: SignupInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await clerkSignUp(values);
      if (!result) return;
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
    });
  }

  if (successMessage) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border bg-accent/40 px-6 py-8 text-center">
        <div className="rounded-full bg-primary/10 p-3 text-primary">
          <CheckCircle2 className="size-6" aria-hidden="true" />
        </div>
        <p className="text-sm text-foreground">{successMessage}</p>
        <Button render={<Link href="/login" />} nativeButton={false}>
          Sign in now
        </Button>
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

        {/* Role Selection */}
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-foreground">Choose your role</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ROLES.map((r) => {
              const isSelected = selectedRole === r.value;
              return (
                <label
                  key={r.value}
                  htmlFor={`role-${r.value}`}
                  className={cn(
                    "relative flex cursor-pointer flex-col gap-1.5 rounded-xl border-2 p-4 transition-all duration-150",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:border-primary/50 hover:bg-muted/30"
                  )}
                >
                  <input
                    type="radio"
                    id={`role-${r.value}`}
                    value={r.value}
                    className="sr-only"
                    {...form.register("role")}
                  />
                  <div className="flex items-center gap-2">
                    <r.icon
                      className={cn("size-4 shrink-0", isSelected ? "text-primary" : "text-muted-foreground")}
                    />
                    <span className={cn("text-sm font-semibold", isSelected ? "text-primary" : "text-foreground")}>
                      {r.label}
                    </span>
                    {isSelected && (
                      <span className="ml-auto h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">{r.description}</p>
                </label>
              );
            })}
          </div>
          {form.formState.errors.role && (
            <p className="mt-1.5 text-xs text-destructive">{form.formState.errors.role.message}</p>
          )}
        </fieldset>

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
