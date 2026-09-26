import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-6">
      <Logo />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Join StockSense to manage your inventory</p>
      </div>
      <SignupForm />
    </div>
  );
}
