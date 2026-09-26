"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { signIn } from "@/actions/auth";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";

export function LoginForm({ next }: { next?: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "", remember: true },
  });

  function onSubmit(values: LoginInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await signIn(values, next);
      if (result && !result.ok) {
        setFormError(result.error);
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        {formError && (
          <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        )}

        <Field data-invalid={!!form.formState.errors.identifier}>
          <FieldLabel htmlFor="identifier">Login ID or Email</FieldLabel>
          <Input
            id="identifier"
            autoComplete="username"
            placeholder="you@company.com or jdoe"
            aria-invalid={!!form.formState.errors.identifier}
            {...form.register("identifier")}
          />
          <FieldError errors={[form.formState.errors.identifier]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.password}>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
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

        <Controller
          control={form.control}
          name="remember"
          render={({ field }) => (
            <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <Checkbox checked={!!field.value} onCheckedChange={(checked) => field.onChange(checked)} />
              Remember me
            </label>
          )}
        />

        <Button type="submit" size="lg" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Sign in
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </FieldGroup>
    </form>
  );
}
