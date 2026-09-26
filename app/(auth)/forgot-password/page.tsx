"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { requestPasswordReset, resetPasswordWithOtp } from "@/actions/auth";
import { forgotSchema, resetSchema, type ForgotInput, type ResetInput } from "@/lib/validations/auth";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const stepOneForm = useForm<ForgotInput>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const stepTwoForm = useForm<ResetInput>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: "", otp: "", password: "", confirmPassword: "" },
  });

  function onRequestOtp(values: ForgotInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await requestPasswordReset(values);
      if (!result.ok) {
        setFormError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Check your email for the code.");
      setEmail(values.email);
      stepTwoForm.setValue("email", values.email);
      setStep(2);
    });
  }

  function onResetPassword(values: ResetInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await resetPasswordWithOtp(values);
      if (result && !result.ok) {
        setFormError(result.error);
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Logo />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reset Your Password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {step === 1 ? "Enter your email to receive a one-time password (OTP)" : "Enter the code we sent and choose a new password"}
        </p>
      </div>

      {formError && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </div>
      )}

      {step === 1 ? (
        <form onSubmit={stepOneForm.handleSubmit(onRequestOtp)} noValidate>
          <FieldGroup>
            <Field data-invalid={!!stepOneForm.formState.errors.email}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                aria-invalid={!!stepOneForm.formState.errors.email}
                {...stepOneForm.register("email")}
              />
              <FieldError errors={[stepOneForm.formState.errors.email]} />
            </Field>

            <Button type="submit" size="lg" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Send OTP
            </Button>
          </FieldGroup>
        </form>
      ) : (
        <form onSubmit={stepTwoForm.handleSubmit(onResetPassword)} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="reset-email">Email</FieldLabel>
              <Input id="reset-email" type="email" value={email} readOnly disabled {...stepTwoForm.register("email")} />
            </Field>

            <Field data-invalid={!!stepTwoForm.formState.errors.otp}>
              <FieldLabel htmlFor="otp">OTP Code</FieldLabel>
              <Input
                id="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                aria-invalid={!!stepTwoForm.formState.errors.otp}
                {...stepTwoForm.register("otp")}
              />
              <FieldError errors={[stepTwoForm.formState.errors.otp]} />
            </Field>

            <Field data-invalid={!!stepTwoForm.formState.errors.password}>
              <FieldLabel htmlFor="new-password">New Password</FieldLabel>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!stepTwoForm.formState.errors.password}
                {...stepTwoForm.register("password")}
              />
              <FieldError errors={[stepTwoForm.formState.errors.password]} />
            </Field>

            <Field data-invalid={!!stepTwoForm.formState.errors.confirmPassword}>
              <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!stepTwoForm.formState.errors.confirmPassword}
                {...stepTwoForm.register("confirmPassword")}
              />
              <FieldError errors={[stepTwoForm.formState.errors.confirmPassword]} />
            </Field>

            <Button type="submit" size="lg" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Reset Password
            </Button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-center text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Use a different email
            </button>
          </FieldGroup>
        </form>
      )}

      <Link href="/login" className="flex items-center justify-center gap-1.5 text-sm font-medium text-primary hover:underline">
        <ArrowLeft className="size-3.5" />
        Back to Login
      </Link>
    </div>
  );
}
